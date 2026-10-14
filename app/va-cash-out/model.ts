// Shared (client + server) definitions for the VA cash-out landing page (/va-cash-out).
// After the contact details the visitor answers only the client's three must-haves (served,
// owns the home, wants cash out); each answer is saved as they go, so someone who stops
// halfway still shows up as a (partial) lead. The loan officer covers the rest on the call.

export const BRAND = "Vet Benefits";

export type Option = [value: string, label: string];

export type QuestionId = "served" | "ownHome" | "wantsCash";

export type Answers = Partial<Record<QuestionId, string>>;

export type Question = { id: QuestionId; title: string; hint?: string; options: Option[] };

export const QUESTIONS: Question[] = [
  {
    id: "served",
    title: "Have you served in the U.S. military?",
    options: [
      ["veteran", "Yes, I'm a veteran"],
      ["active", "Yes, active duty"],
      ["guard", "National Guard or Reserve"],
      ["spouse", "Surviving spouse of a veteran"],
      ["no", "No"],
    ],
  },
  {
    id: "ownHome",
    title: "Do you own your home?",
    options: [
      ["yes", "Yes, I own my home"],
      ["no", "No, I rent or live with family"],
    ],
  },
  {
    id: "wantsCash",
    title: "Are you looking to take cash out of your home?",
    hint: "For example to pay off debt, fix up the house or have a cushion.",
    options: [
      ["yes", "Yes, I'd like to access cash"],
      ["no", "No, not right now"],
    ],
  },
];

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  QUESTIONS.find((q) => q.id === id)?.options.find(([v]) => v === value)?.[1] ?? "";

/** Answers that rule a visitor out: only veterans / service members / surviving spouses who
 *  own their home and want cash out are a match. The visitor still answers every question;
 *  the reasons are shown at the end with a way to ask for a call back if it was a mistake. */
const RULES: [QuestionId, string][] = [
  ["served", "no"],
  ["ownHome", "no"],
  ["wantsCash", "no"],
];

export function disqualifiers(a: Answers): { id: QuestionId; question: string; answer: string }[] {
  return RULES.filter(([id, v]) => a[id] === v).map(([id, v]) => ({ id, question: QUESTIONS.find((q) => q.id === id)!.title, answer: optionLabel(id, v) }));
}

/** Who will contact the visitor. Put the lender's name here once the client confirms it. */
export const PARTNER = "its mortgage lending partners";

/** Shown next to the checkbox and saved word-for-word with each lead as proof of consent. */
export const CONSENT_TEXT =
  `By checking this box, I agree that ${BRAND} and ${PARTNER} may contact me about home equity and refinance options ` +
  "at the phone number and email I provided, including by calls and text messages that may use automated technology " +
  "or prerecorded messages. Consent is not required to get a loan or any service. Message and data rates may apply. " +
  "I can opt out at any time by replying STOP or asking not to be contacted.";

export const MIN_AGE = 18;
export const MAX_AGE = 110;
