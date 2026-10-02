// Call log / notes kept on a lead (Seguros and Facturación): who wrote it, when,
// what happened on the call, and free text. Newest first when shown.
// "Volver a llamar" can carry a date: the lead then has a pending follow-up, and the
// daily cron reminds the team on Telegram from that day until it is done.

export type LeadNote = { at: number; by: string; outcome: string; text: string; due?: string };

/** A pending "call back" on a lead. `date` is YYYY-MM-DD. */
export type FollowUp = { date: string; by: string; note: string };

export const NOTE_OUTCOMES: [id: string, label: string][] = [
  ["nota", "Nota"],
  ["no-contesto", "Llamada: no contestó"],
  ["buzon", "Llamada: dejé mensaje de voz"],
  ["hablamos", "Llamada: hablamos"],
  ["volver", "Volver a llamar"],
  ["equivocado", "Número equivocado"],
];

export const outcomeLabel = (id: string) => NOTE_OUTCOMES.find(([k]) => k === id)?.[1] ?? "Nota";

const MAX_NOTES = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date (YYYY-MM-DD) where the office is. */
export const todayIn = (timeZone = "America/New_York") => new Date().toLocaleDateString("en-CA", { timeZone });

/** "2026-10-05" → "5 oct". */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Validates a new entry; a call outcome alone is enough (text optional), a plain note needs text. */
export function newNote(input: { outcome?: string; text?: string; due?: string }, by: string): LeadNote | null {
  const outcome = NOTE_OUTCOMES.some(([k]) => k === input.outcome) ? String(input.outcome) : "nota";
  const text = String(input.text ?? "").trim().slice(0, 2000);
  if (!text && outcome === "nota") return null;
  const due = outcome === "volver" && DAY.test(String(input.due ?? "")) ? String(input.due) : undefined;
  return { at: Date.now(), by: by.trim().slice(0, 60), outcome, text, ...(due ? { due } : {}) };
}

/** Adds the entry and updates the pending follow-up: "Volver a llamar" with a date sets it,
 *  any other call entry means the call happened (clears it), a plain note leaves it alone. */
export function applyNote<T extends { log?: LeadNote[]; followUp?: FollowUp }>(lead: T, note: LeadNote): T {
  const next = { ...lead, log: [...(lead.log ?? []), note].slice(-MAX_NOTES) };
  if (note.outcome === "volver" && note.due) next.followUp = { date: note.due, by: note.by, note: note.text };
  else if (note.outcome !== "nota") delete next.followUp;
  return next;
}
