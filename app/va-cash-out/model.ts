// Shared (client + server) definitions for the VA cash-out landing page (/va-cash-out).
// The questions come after the contact details; each answer is saved as the visitor goes,
// so someone who stops halfway still shows up as a (partial) lead.

export type Option = [value: string, label: string];

export type QuestionId =
  | "served"
  | "ownHome"
  | "loanType"
  | "rate"
  | "homeValue"
  | "balance"
  | "cashAmount"
  | "purpose"
  | "credit"
  | "recentRefi";

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
    id: "loanType",
    title: "What kind of mortgage do you have now?",
    options: [
      ["va", "VA loan"],
      ["fha", "FHA loan"],
      ["conventional", "Conventional loan"],
      ["paid-off", "My home is paid off"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    id: "rate",
    title: "About what interest rate do you pay on your mortgage?",
    hint: "Your best guess is fine.",
    options: [
      ["under-4", "Under 4%"],
      ["4-5", "4% to 5%"],
      ["5-6.5", "5% to 6.5%"],
      ["over-6.5", "Over 6.5%"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    id: "homeValue",
    title: "About how much is your home worth?",
    hint: "Your best guess is fine.",
    options: [
      ["under-150", "Under $150,000"],
      ["150-250", "$150,000 – $250,000"],
      ["250-400", "$250,000 – $400,000"],
      ["400-600", "$400,000 – $600,000"],
      ["600-1000", "$600,000 – $1 million"],
      ["over-1000", "Over $1 million"],
    ],
  },
  {
    id: "balance",
    title: "About how much do you still owe on your mortgage?",
    options: [
      ["under-100", "Under $100,000"],
      ["100-200", "$100,000 – $200,000"],
      ["200-300", "$200,000 – $300,000"],
      ["300-450", "$300,000 – $450,000"],
      ["450-650", "$450,000 – $650,000"],
      ["over-650", "Over $650,000"],
    ],
  },
  {
    id: "cashAmount",
    title: "How much cash would you like to take out?",
    options: [
      ["under-25", "Under $25,000"],
      ["25-50", "$25,000 – $50,000"],
      ["50-100", "$50,000 – $100,000"],
      ["100-200", "$100,000 – $200,000"],
      ["over-200", "Over $200,000"],
    ],
  },
  {
    id: "purpose",
    title: "What would you use the cash for?",
    options: [
      ["debt", "Pay off credit cards or other debt"],
      ["improvements", "Home repairs or improvements"],
      ["cushion", "Emergency fund / breathing room"],
      ["property", "Buy another property"],
      ["other", "Something else"],
    ],
  },
  {
    id: "credit",
    title: "How would you describe your credit?",
    options: [
      ["excellent", "Excellent (720+)"],
      ["good", "Good (680 – 719)"],
      ["fair", "Fair (620 – 679)"],
      ["below-620", "Below 620"],
      ["not-sure", "Not sure"],
    ],
  },
  {
    id: "recentRefi",
    title: "Have you refinanced your home in the last 12 months?",
    options: [
      ["no", "No"],
      ["yes", "Yes"],
    ],
  },
];

/** Questions that apply given the answers so far (no rate or balance questions for a paid-off home). */
export function activeQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((q) => !(a.loanType === "paid-off" && (q.id === "rate" || q.id === "balance")));
}

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  QUESTIONS.find((q) => q.id === id)?.options.find(([v]) => v === value)?.[1] ?? "";

/** Answers that rule a visitor out: only veterans / service members / surviving spouses who
 *  own their home are a match. The visitor still answers every question; the reasons are
 *  shown at the end with a way to ask for a call back if they answered by mistake. */
const RULES: [QuestionId, string][] = [
  ["served", "no"],
  ["ownHome", "no"],
];

export function disqualifiers(a: Answers): { id: QuestionId; question: string; answer: string }[] {
  return RULES.filter(([id, v]) => a[id] === v).map(([id, v]) => ({ id, question: QUESTIONS.find((q) => q.id === id)!.title, answer: optionLabel(id, v) }));
}

// Rough midpoints (in $1,000s) to estimate equity from the range answers.
const MID: Record<string, number> = {
  "under-150": 120, "150-250": 200, "250-400": 325, "400-600": 500, "600-1000": 800, "over-1000": 1200,
  "under-100": 60, "100-200": 150, "200-300": 250, "300-450": 375, "450-650": 550, "over-650": 750,
};

/** Estimated loan-to-value (0–1+) from the ranges, or null when we can't tell. */
export function estimatedLtv(a: Answers): number | null {
  if (a.loanType === "paid-off") return 0;
  const value = MID[a.homeValue ?? ""];
  const owed = MID[a.balance ?? ""];
  return value && owed ? owed / value : null;
}

/** Which product the loan officer will probably lead with (they make the final call). */
export function likelyProduct(a: Answers): string {
  if (a.loanType === "fha" || a.loanType === "conventional") return "VA cash-out refinance";
  if (a.rate === "under-4" || a.rate === "4-5") return "HELOC / second mortgage";
  if (a.rate === "5-6.5" || a.rate === "over-6.5") return "VA cash-out refinance";
  if (a.loanType === "paid-off") return "VA cash-out or HELOC";
  return "Loan officer to decide";
}

/** Short notes for whoever calls the lead. */
export function leadFlags(a: Answers): string[] {
  const out: string[] = [];
  const ltv = estimatedLtv(a);
  if (ltv !== null && ltv >= 0.9) out.push("Low equity (est. 90%+ owed)");
  if (a.recentRefi === "yes") out.push("Refinanced in the last 12 months (seasoning)");
  if (a.credit === "below-620") out.push("Credit below 620");
  return out;
}

/** Who will contact the visitor. Put the lender's name here once the client confirms it. */
export const PARTNER = "its mortgage lending partners";

/** Shown next to the checkbox and saved word-for-word with each lead as proof of consent. */
export const CONSENT_TEXT =
  `By checking this box, I agree that Pro-DG and ${PARTNER} may contact me about home equity and refinance options ` +
  "at the phone number and email I provided, including by calls and text messages that may use automated technology " +
  "or prerecorded messages. Consent is not required to get a loan or any service. Message and data rates may apply. " +
  "I can opt out at any time by replying STOP or asking not to be contacted.";

export const MIN_AGE = 18;
export const MAX_AGE = 110;
