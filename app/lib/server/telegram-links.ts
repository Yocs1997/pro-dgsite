import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "./redis";

// Personal Telegram messages for portal users (e.g. "a lead was assigned to you").
// A user connects by opening t.me/<bot>?start=<code> and tapping Start; the bot's
// webhook (/api/telegram/webhook) receives "/start <code>" and saves their chat id.
// Uses the same bot as the group alerts (TELEGRAM_BOT_TOKEN) — no new settings.

const CHATS = "pdg:tg:users"; // hash: lowercase username -> chat id
const LINK = (code: string) => `pdg:tg:link:${code}`;
const BOT_NAME = "pdg:tg:botname";

const api = () => process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
const siteUrl = () => (process.env.SITE_URL || "https://www.pro-dg.com").replace(/\/$/, "");

async function call<T = unknown>(method: string, body?: unknown): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no está configurado.");
  const res = await fetch(`${api()}/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!json.ok) throw new Error(json.description || `Telegram ${method} falló`);
  return json.result as T;
}

/** Secret Telegram sends with every webhook call (derived from the bot token, so no new setting). */
export function webhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return createHmac("sha256", token || "none").update("pdg-telegram-webhook").digest("hex").slice(0, 48);
}

/** Points the bot's updates at this site (idempotent). */
export async function ensureWebhook(): Promise<void> {
  const url = `${siteUrl()}/api/telegram/webhook`;
  const info = await call<{ url?: string }>("getWebhookInfo");
  if (info?.url === url) return;
  await call("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["message"], drop_pending_updates: true });
}

export async function botUsername(): Promise<string> {
  const [cached] = (await db([["GET", BOT_NAME]])) as [string | null];
  if (cached) return cached;
  const me = await call<{ username: string }>("getMe");
  await db([["SET", BOT_NAME, me.username, "EX", 86400]]);
  return me.username;
}

/** One-time link that connects this portal user's Telegram (valid 7 days). */
export async function createLink(username: string): Promise<string> {
  await ensureWebhook();
  const code = randomBytes(12).toString("base64url");
  await db([["SET", LINK(code), username.toLowerCase(), "EX", 7 * 86400]]);
  return `https://t.me/${await botUsername()}?start=${code}`;
}

/** Called by the webhook for "/start <code>". Returns the username that got connected. */
export async function redeemLink(code: string, chatId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(code)) return null;
  const [u] = (await db([["GET", LINK(code)]])) as [string | null];
  if (!u) return null;
  await db([["HSET", CHATS, u, chatId], ["DEL", LINK(code)]]);
  return u;
}

export async function chatFor(username: string): Promise<string | null> {
  const [id] = (await db([["HGET", CHATS, username.toLowerCase()]])) as [string | null];
  return id;
}

export async function connectedUsers(): Promise<Set<string>> {
  const [flat] = (await db([["HGETALL", CHATS]])) as [string[] | Record<string, string>];
  const keys = Array.isArray(flat) ? flat.filter((_, i) => i % 2 === 0) : Object.keys(flat ?? {});
  return new Set(keys);
}

export async function disconnect(username: string) {
  await db([["HDEL", CHATS, username.toLowerCase()]]);
}

/** Replies in a chat (used by the webhook). */
export async function reply(chatId: string | number, html: string) {
  await call("sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }).catch((e) =>
    console.error("[telegram] reply failed", e)
  );
}
