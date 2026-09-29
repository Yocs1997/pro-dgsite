import "server-only";

// Telegram notifications (new leads, received emails, clicks, unsubscribes...).
//
// Environment variables (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN   from @BotFather, e.g. 123456789:AA...
//   TELEGRAM_CHAT_ID     who receives the messages: your chat id, or a group id
//                        (starts with -). Several ids can be separated by commas.
//
// Without them nothing is sent. A Telegram problem never breaks the caller.

export function telegramReady(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Escapes text for Telegram's HTML mode. */
export const tg = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PORTAL = "https://www.pro-dg.com/agentes";
export const portalLink = (path = "", label = "Abrir en el portal") => `<a href="${PORTAL}${path}">${tg(label)}</a>`;

/** Sends one message (HTML allowed; escape user data with tg()). Returns true if every chat got it. */
export async function notifyTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (!token || !chats.length) return false;
  const results = await Promise.all(
    chats.map(async (chat_id) => {
      try {
        const api = process.env.TELEGRAM_API_BASE || "https://api.telegram.org"; // override only for local testing
        const res = await fetch(`${api}/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!res.ok) console.error("[telegram] send failed", res.status, (await res.text()).slice(0, 200));
        return res.ok;
      } catch (e) {
        console.error("[telegram] send failed", e);
        return false;
      }
    })
  );
  return results.every(Boolean);
}
