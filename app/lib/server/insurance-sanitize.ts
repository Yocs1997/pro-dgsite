import "server-only";
import {
  isEmail,
  phoneDigits,
  MAX_EXTRA_DRIVERS,
  MAX_VEHICLES,
  OPTIONS,
  US_STATES,
  type Coverage,
  type Driver,
  type ExtraDriver,
  type InsuranceInput,
  type OptionGroup,
  type Vehicle,
} from "@/app/seguros/model";

// Cleans and validates insurance data. Used by the public form and by admin edits.

const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const opt = (group: OptionGroup, v: unknown) => {
  const val = s(v, 40);
  return val in OPTIONS[group] ? val : "";
};
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(s(v, 10)) ? s(v, 10) : "");
const stateCode = (v: unknown) => (US_STATES.some(([c]) => c === s(v, 2).toUpperCase()) ? s(v, 2).toUpperCase() : "");

export type CleanInsurance = { driver: Driver; extraDrivers: ExtraDriver[]; vehicles: Vehicle[]; coverage: Coverage };

export function sanitizeInsurance(input: Partial<InsuranceInput>): CleanInsurance {
  const d = (input?.driver ?? {}) as Partial<Driver>;
  const driver: Driver = {
    firstName: s(d.firstName, 60),
    lastName: s(d.lastName, 60),
    dob: date(d.dob),
    gender: opt("gender", d.gender),
    marital: opt("marital", d.marital),
    email: s(d.email, 120).toLowerCase(),
    phone: s(d.phone, 30),
    street: s(d.street, 120),
    city: s(d.city, 60),
    state: stateCode(d.state),
    zip: s(d.zip, 10).replace(/[^\d-]/g, ""),
    licenseStatus: opt("licenseStatus", d.licenseStatus),
    licenseState: stateCode(d.licenseState),
    licenseNumber: s(d.licenseNumber, 30),
    yearsLicensed: s(d.yearsLicensed, 3).replace(/\D/g, ""),
    accidents: opt("count", d.accidents) || "0",
    tickets: opt("count", d.tickets) || "0",
    sr22: opt("yesno", d.sr22) || "no",
  };
  const extraDrivers = (Array.isArray(input?.extraDrivers) ? input.extraDrivers : [])
    .slice(0, MAX_EXTRA_DRIVERS)
    .map((x) => ({
      firstName: s(x?.firstName, 60),
      lastName: s(x?.lastName, 60),
      dob: date(x?.dob),
      relationship: opt("relationship", x?.relationship),
      licenseStatus: opt("licenseStatus", x?.licenseStatus),
    }))
    .filter((x) => x.firstName || x.lastName);
  const vehicles = (Array.isArray(input?.vehicles) ? input.vehicles : [])
    .slice(0, MAX_VEHICLES)
    .map((v) => ({
      year: s(v?.year, 4).replace(/\D/g, ""),
      make: s(v?.make, 40),
      model: s(v?.model, 60),
      vin: s(v?.vin, 17).toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""),
      ownership: opt("ownership", v?.ownership),
      use: opt("use", v?.use),
      miles: opt("miles", v?.miles),
    }))
    .filter((v) => v.year || v.make || v.model);
  const c = (input?.coverage ?? {}) as Partial<Coverage>;
  const coverage: Coverage = {
    insured: opt("insured", c.insured),
    currentCarrier: s(c.currentCarrier, 60),
    level: opt("level", c.level),
    deductible: opt("deductible", c.deductible),
    startDate: date(c.startDate),
    contactPref: opt("contactPref", c.contactPref) || "email",
    notes: s(c.notes, 1500),
  };
  return { driver, extraDrivers, vehicles, coverage };
}

/**
 * Required fields. With a license photo, the person's details can be read from the
 * photo, so only email + phone are required for the driver.
 */
export function missingRequired(x: CleanInsurance, hasLicensePhoto: boolean): boolean {
  const d = x.driver;
  const contactOk = isEmail(d.email) && phoneDigits(d.phone).length >= 10;
  const driverOk = hasLicensePhoto || (d.firstName && d.lastName && d.dob && d.state && /^\d{5}$/.test(d.zip) && d.licenseStatus);
  const vehiclesOk = x.vehicles.length > 0 && x.vehicles.every((v) => /^\d{4}$/.test(v.year) && v.make && v.model);
  const coverageOk = x.coverage.insured && x.coverage.level;
  return !(contactOk && driverOk && vehiclesOk && coverageOk);
}

/** Accepts up to 2 browser-compressed images as data URLs. */
export function sanitizePhotos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 2)
    .map(String)
    .filter((p) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) && p.length <= 1_600_000);
}
