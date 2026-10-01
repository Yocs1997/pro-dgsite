// Call log / notes kept on a lead (Seguros and Facturación): who wrote it, when,
// what happened on the call, and free text. Newest first when shown.

export type LeadNote = { at: number; by: string; outcome: string; text: string };

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

/** Validates a new entry; a call outcome alone is enough (text optional), a plain note needs text. */
export function newNote(input: { outcome?: string; text?: string }, by: string): LeadNote | null {
  const outcome = NOTE_OUTCOMES.some(([k]) => k === input.outcome) ? String(input.outcome) : "nota";
  const text = String(input.text ?? "").trim().slice(0, 2000);
  if (!text && outcome === "nota") return null;
  return { at: Date.now(), by: by.trim().slice(0, 60), outcome, text };
}

export const appendNote = (log: LeadNote[] | undefined, note: LeadNote): LeadNote[] => [...(log ?? []), note].slice(-MAX_NOTES);
