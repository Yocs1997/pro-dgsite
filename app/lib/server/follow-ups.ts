import "server-only";
import { listLeads } from "./insurance";
import { listPosLeads, waLink, type PosLead } from "./pos-leads";
import { notifyTelegram, portalLink, posChats, tg } from "./telegram";
import { chatFor } from "./telegram-links";
import { dayLabel, todayIn } from "@/app/lib/lead-notes";
import { leadService, productLabel } from "@/app/lib/lead-service";

// "Volver a llamar" reminders. The daily cron (10 a.m. Eastern) messages every call
// that is due today or still pending from earlier days:
//   Seguros      → the main Telegram group
//   Facturación  → the assigned agent's own chat; the billing group when the lead
//                  has no agent or the agent has not connected Telegram

const MAX_LINES = 20;
const late = (date: string, today: string) => (date < today ? ` <i>(atrasada desde el ${tg(dayLabel(date))})</i>` : "");
const more = (n: number) => (n > MAX_LINES ? `\n… y ${n - MAX_LINES} más` : "");

export async function sendFollowUpReminders(): Promise<{ insurance: number; pos: number }> {
  const today = todayIn();

  // ── Seguros ──
  const ins = (await listLeads(1000))
    .filter((l) => l.followUp && l.followUp.date <= today && l.status !== "vendida" && l.status !== "perdida")
    .sort((a, b) => a.followUp!.date.localeCompare(b.followUp!.date));
  if (ins.length) {
    const lines = ins.slice(0, MAX_LINES).map((l) => {
      const name = [l.driver?.firstName, l.driver?.lastName].filter(Boolean).join(" ") || l.driver?.email || "(sin nombre)";
      const service = leadService(l);
      return (
        `• <b>${tg(l.code)}</b> ${tg(name)}${l.driver?.phone ? ` · ${tg(l.driver.phone)}` : ""}${service ? ` · ${tg(productLabel(service, "es"))}` : ""}` +
        late(l.followUp!.date, today) +
        (l.followUp!.note ? `\n   ${tg(l.followUp!.note.slice(0, 200))}` : "")
      );
    });
    await notifyTelegram([`📞 <b>Llamadas pendientes para hoy</b> · Seguros (${ins.length})`, lines.join("\n") + more(ins.length), portalLink("/seguros", "Abrir Seguros")].join("\n\n"));
  }

  // ── Facturación ──
  const pos = (await listPosLeads())
    .filter((l) => l.followUp && l.followUp.date <= today && l.status !== "cerrada" && l.status !== "perdida")
    .sort((a, b) => a.followUp!.date.localeCompare(b.followUp!.date));
  const byChat = new Map<string, PosLead[]>();
  for (const l of pos) {
    const own = l.assignedTo ? await chatFor(l.assignedTo.u).catch(() => null) : null;
    const chat = own || posChats();
    if (chat) byChat.set(chat, [...(byChat.get(chat) ?? []), l]);
  }
  for (const [chat, list] of byChat) {
    const lines = list.slice(0, MAX_LINES).map((l) => {
      const wa = waLink(l);
      return (
        `• <b>${tg(l.code)}</b> ${tg(l.name || l.business || "(sin nombre)")}${l.phone ? ` · ${tg(l.phone)}` : ""}` +
        (chat === posChats() && l.assignedTo ? ` · ${tg(l.assignedTo.name)}` : "") +
        late(l.followUp!.date, today) +
        (l.followUp!.note ? `\n   ${tg(l.followUp!.note.slice(0, 200))}` : "") +
        (wa ? `\n   <a href="${wa}">WhatsApp</a>` : "")
      );
    });
    await notifyTelegram(
      [`📞 <b>Llamadas pendientes para hoy</b> · Facturación (${list.length})`, lines.join("\n") + more(list.length), portalLink("/facturacion", "Abrir en el portal")].join("\n\n"),
      chat
    );
  }
  return { insurance: ins.length, pos: pos.length };
}
