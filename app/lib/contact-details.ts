import { US_STATES } from "@/app/seguros/model";

// Extra contact details used to personalize sequence emails: state, phone, vehicle,
// language and insurance status. Safe to import from client and server code.

// US area codes by state (geographic codes; used only to guess a missing state).
const AREA_CODES: Record<string, string> = {
  AL: "205 251 256 334 659 938",
  AK: "907",
  AZ: "480 520 602 623 928",
  AR: "327 479 501 870",
  CA: "209 213 279 310 323 341 350 369 408 415 424 442 510 530 559 562 619 626 628 650 657 661 669 707 714 747 760 805 818 820 831 840 858 909 916 925 949 951",
  CO: "303 719 720 970 983",
  CT: "203 475 860 959",
  DE: "302",
  DC: "202 771",
  FL: "239 305 321 324 352 386 407 448 561 645 656 689 727 728 754 772 786 813 850 863 904 941 954",
  GA: "229 404 470 478 678 706 762 770 912 943",
  HI: "808",
  ID: "208 986",
  IL: "217 224 309 312 331 447 464 618 630 708 730 773 779 815 847 861 872",
  IN: "219 260 317 463 574 765 812 930",
  IA: "319 515 563 641 712",
  KS: "316 620 785 913",
  KY: "270 364 502 606 859",
  LA: "225 318 337 457 504 985",
  ME: "207",
  MD: "227 240 301 410 443 667",
  MA: "339 351 413 508 617 774 781 857 978",
  MI: "231 248 269 313 517 586 616 679 734 810 906 947 989",
  MN: "218 320 507 612 651 763 924 952",
  MS: "228 601 662 769",
  MO: "235 314 417 557 573 636 660 816 975",
  MT: "406",
  NE: "308 402 531",
  NV: "702 725 775",
  NH: "603",
  NJ: "201 551 609 640 732 848 856 862 908 973",
  NM: "505 575",
  NY: "212 315 329 332 347 363 516 518 585 607 624 631 646 680 716 718 838 845 914 917 929 934",
  NC: "252 336 472 704 743 828 910 919 980 984",
  ND: "701",
  OH: "216 220 234 283 326 330 380 419 436 440 513 567 614 740 937",
  OK: "405 539 572 580 918",
  OR: "458 503 541 971",
  PA: "215 223 267 272 412 445 484 570 582 610 717 724 814 835 878",
  RI: "401",
  SC: "803 821 839 843 854 864",
  SD: "605",
  TN: "423 615 629 731 865 901 931",
  TX: "210 214 254 281 325 346 361 409 430 432 469 512 682 713 726 737 806 817 830 832 903 915 936 940 945 956 972 979",
  UT: "385 435 801",
  VT: "802",
  VA: "276 434 540 571 686 703 757 804 826 948",
  WA: "206 253 360 425 509 564",
  WV: "304 681",
  WI: "262 274 353 414 534 608 715 920",
  WY: "307",
  PR: "787 939",
};

const BY_CODE = new Map<string, string>();
for (const [st, codes] of Object.entries(AREA_CODES)) for (const c of codes.split(" ")) BY_CODE.set(c, st);

const NAMES = new Map<string, string>([...US_STATES, ["PR", "Puerto Rico"]]);
const BY_NAME = new Map<string, string>();
for (const [code, name] of NAMES) BY_NAME.set(name.toLowerCase(), code);
// Common Spanish / short spellings.
for (const [k, v] of Object.entries({
  "nueva york": "NY", "new york city": "NY", nyc: "NY", "nueva jersey": "NJ", "washington dc": "DC", "washington d.c.": "DC",
  "d.c.": "DC", "distrito de columbia": "DC", "carolina del norte": "NC", "carolina del sur": "SC", pensilvania: "PA",
  "florida": "FL", "virginia occidental": "WV", "puerto rico": "PR",
})) BY_NAME.set(k, v);

/** Two-letter code for a state written as a code or a name ("ny", "New York", "Nueva York"). "" if unknown. */
export function normalizeState(v: string): string {
  const s = v.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return "";
  if (/^[a-z]{2}$/.test(s) && NAMES.has(s.toUpperCase())) return s.toUpperCase();
  return BY_NAME.get(s) ?? "";
}

/** Full state name for a code ("NY" → "New York"); unknown values are returned as they are. */
export function stateLabel(code: string): string {
  if (code.toUpperCase() === "DC") return "Washington, DC";
  return NAMES.get(code.toUpperCase()) ?? code;
}

/** Guesses the state from a US phone number's area code. "" if it can't. */
export function stateFromPhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? BY_CODE.get(d.slice(0, 3)) ?? "" : "";
}

/** yes | lapsed | no | "" from free text ("sí", "insured", "vencido", "no"...). */
export function normalizeInsured(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  if (/venc|laps|expir/.test(s)) return "lapsed";
  // (?![a-zá-ú]) instead of \b: \b doesn't treat accented letters like "í" as letters.
  if (/^(no|none|sin|ninguno|n)(?![a-zá-ú])/.test(s) || /no tiene|uninsured|sin seguro/.test(s)) return "no";
  if (/^(s[ií]|yes|y|insured|asegurado|tiene|activo|active)(?![a-zá-ú])/.test(s)) return "yes";
  return "";
}

/** es | en | "" from free text. */
export function normalizeLang(v: string): "es" | "en" | "" {
  const s = v.trim().toLowerCase();
  if (/^(es|esp|español|espanol|spanish|sp)/.test(s)) return "es";
  if (/^(en|eng|english|ingl[eé]s)/.test(s)) return "en";
  return "";
}

export const INSURED_LABEL: Record<string, string> = { yes: "Con seguro", lapsed: "Vencido", no: "Sin seguro" };
