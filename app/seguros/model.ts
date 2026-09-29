// Shared (client + server) definitions for the car insurance quote form.

export type Lang = "es" | "en";

export type Driver = {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  marital: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  licenseStatus: string;
  licenseState: string;
  licenseNumber: string;
  yearsLicensed: string;
  accidents: string;
  tickets: string;
  sr22: string;
};

export type ExtraDriver = {
  firstName: string;
  lastName: string;
  dob: string;
  relationship: string;
  licenseStatus: string;
};

export type Vehicle = {
  year: string;
  make: string;
  model: string;
  vin: string;
  ownership: string;
  use: string;
  miles: string;
};

export type Coverage = {
  insured: string;
  currentCarrier: string;
  level: string;
  deductible: string;
  startDate: string;
  contactPref: string;
  notes: string;
};

export type InsuranceInput = {
  lang: Lang;
  driver: Driver;
  extraDrivers: ExtraDriver[];
  vehicles: Vehicle[];
  coverage: Coverage;
  consent: boolean;
  website?: string; // honeypot — must stay empty
};

export const emptyDriver = (): Driver => ({
  firstName: "", lastName: "", dob: "", gender: "", marital: "", email: "", phone: "",
  street: "", city: "", state: "", zip: "", licenseStatus: "", licenseState: "", licenseNumber: "",
  yearsLicensed: "", accidents: "0", tickets: "0", sr22: "no",
});
export const emptyExtraDriver = (): ExtraDriver => ({ firstName: "", lastName: "", dob: "", relationship: "", licenseStatus: "" });
export const emptyVehicle = (): Vehicle => ({ year: "", make: "", model: "", vin: "", ownership: "", use: "", miles: "" });
export const emptyCoverage = (): Coverage => ({
  insured: "", currentCarrier: "", level: "", deductible: "", startDate: "", contactPref: "email", notes: "",
});

export const MAX_EXTRA_DRIVERS = 4;
export const MAX_VEHICLES = 4;

export const US_STATES: [string, string][] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],
  ["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],
  ["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],
  ["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],
  ["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],
  ["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],
  ["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
  ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],
  ["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

export const COMMON_MAKES = [
  "Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","GMC","Honda","Hyundai",
  "Infiniti","Jeep","Kia","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Ram","Subaru",
  "Tesla","Toyota","Volkswagen","Volvo",
];

/** Select options: value → [Spanish label, English label] */
export const OPTIONS = {
  gender: { m: ["Masculino", "Male"], f: ["Femenino", "Female"], x: ["Prefiero no decir", "Prefer not to say"] },
  marital: {
    single: ["Soltero(a)", "Single"], married: ["Casado(a)", "Married"],
    divorced: ["Divorciado(a)", "Divorced"], widowed: ["Viudo(a)", "Widowed"],
  },
  licenseStatus: {
    us: ["Licencia de EE. UU.", "U.S. license"],
    intl: ["Licencia internacional / extranjera", "International / foreign license"],
    permit: ["Permiso de aprendizaje", "Learner's permit"],
    none: ["Sin licencia", "No license"],
  },
  relationship: {
    spouse: ["Esposo(a) / pareja", "Spouse / partner"], child: ["Hijo(a)", "Child"],
    parent: ["Padre / madre", "Parent"], other: ["Otro", "Other"],
  },
  ownership: { owned: ["Propio (pagado)", "Owned (paid off)"], financed: ["Financiado", "Financed"], leased: ["Arrendado (lease)", "Leased"] },
  use: {
    personal: ["Personal", "Personal"], commute: ["Ir al trabajo / escuela", "Commute to work / school"],
    business: ["Negocio", "Business"], rideshare: ["Uber / Lyft / entregas", "Rideshare / delivery"],
  },
  miles: {
    lt7500: ["Menos de 7,500", "Under 7,500"], "7500-12000": ["7,500 – 12,000", "7,500 – 12,000"],
    "12000-20000": ["12,000 – 20,000", "12,000 – 20,000"], gt20000: ["Más de 20,000", "Over 20,000"],
  },
  insured: { yes: ["Sí, tengo seguro ahora", "Yes, I'm insured now"], lapsed: ["Tuve, pero se venció", "I had it, but it lapsed"], no: ["No tengo seguro", "No current insurance"] },
  level: {
    minimum: ["Responsabilidad civil mínima (lo que exige el estado)", "State minimum liability"],
    standard: ["Responsabilidad civil ampliada", "Higher liability limits"],
    full: ["Cobertura completa (choque + integral)", "Full coverage (collision + comprehensive)"],
  },
  deductible: { "250": ["US$250", "$250"], "500": ["US$500", "$500"], "1000": ["US$1,000", "$1,000"], unsure: ["No estoy seguro(a)", "Not sure"] },
  contactPref: { email: ["Correo electrónico", "Email"], phone: ["Llamada", "Phone call"], whatsapp: ["WhatsApp", "WhatsApp"], text: ["Mensaje de texto", "Text message"] },
  yesno: { no: ["No", "No"], yes: ["Sí", "Yes"] },
  count: { "0": ["0", "0"], "1": ["1", "1"], "2": ["2", "2"], "3+": ["3 o más", "3 or more"] },
} as const;

export type OptionGroup = keyof typeof OPTIONS;

export function label(group: OptionGroup, value: string, lang: Lang): string {
  const g = OPTIONS[group] as Record<string, readonly [string, string]>;
  const pair = g[value];
  return pair ? pair[lang === "es" ? 0 : 1] : value;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const phoneDigits = (s: string) => s.replace(/\D/g, "");
