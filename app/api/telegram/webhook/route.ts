import { timingSafeEqual } from "node:crypto";
import { dbReady } from "@/app/lib/server/redis";
import { redeemLink, reply, webhookSecret } from "@/app/lib/server/telegram-links";
import { tg } from "@/app/lib/server/telegram";

// Telegram bot webhook (set up automatically from Usuarios → "Conectar Telegram").
//   /start <code>  connects a portal user's personal chat (link generated in Usuarios)
//   /id            replies with this chat's id (handy for new groups)
// Everything else is ignored.

type Update = { message?: { text?: string; chat?: { id: number; type?: string; title?: string }; from?: { first_name?: string } } };

function authorized(req: Request) {
  const given = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(webhookSecret());
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  let update: Update;
  try {
    update = await req.json();
  } catch {
    return new Response("ok");
  }
  const m = update.message;
  const text = (m?.text ?? "").trim();
  const chatId = m?.chat?.id;
  if (!chatId || !text.startsWith("/")) return new Response("ok");

  const [cmdRaw, arg = ""] = text.split(/\s+/, 2);
  const cmd = cmdRaw.split("@")[0].toLowerCase(); // "/start@ctrspdgbot" → "/start"

  if (cmd === "/id") {
    await reply(chatId, `ID de este chat: <code>${tg(chatId)}</code>`);
  } else if (cmd === "/start") {
    if (m?.chat?.type !== "private") return new Response("ok");
    if (!arg) {
      await reply(chatId, "Hola 👋 Para recibir tus leads aquí, abre el enlace que te envió tu administrador desde el portal de Pro-DG.");
    } else if (!dbReady()) {
      await reply(chatId, "El portal no está disponible en este momento. Intenta de nuevo más tarde.");
    } else {
      const u = await redeemLink(arg, String(chatId));
      await reply(
        chatId,
        u
          ? `✅ Listo${m?.from?.first_name ? `, ${tg(m.from.first_name)}` : ""}. Tu cuenta <b>${tg(u)}</b> del portal quedó conectada: aquí recibirás los leads que te asignen.`
          : "Este enlace ya se usó o venció. Pide uno nuevo a tu administrador."
      );
    }
  }
  return new Response("ok");
}
