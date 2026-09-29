"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { saveLeadEdits } from "../admin-actions";
import {
  OPTIONS,
  US_STATES,
  emptyExtraDriver,
  emptyVehicle,
  label,
  type Coverage,
  type Driver,
  type ExtraDriver,
  type OptionGroup,
  type Vehicle,
} from "@/app/seguros/model";

type Data = { driver: Driver; extraDrivers: ExtraDriver[]; vehicles: Vehicle[]; coverage: Coverage };

const inp = "w-full rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[#33aaff]";
const sel = inp + " bg-[#0F3470]";

function F({ l, children, wide }: { l: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={"flex flex-col gap-1 min-w-0 " + (wide ? "sm:col-span-2 lg:col-span-3" : "")}>
      <span className="text-[11px] font-mono uppercase tracking-wider text-[#7cc4ff]">{l}</span>
      {children}
    </label>
  );
}

function Opt({ group, value, onChange }: { group: OptionGroup; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
      <option value="">—</option>
      {Object.keys(OPTIONS[group]).map((v) => (
        <option key={v} value={v}>
          {label(group, v, "es")}
        </option>
      ))}
    </select>
  );
}

function StateSel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
      <option value="">—</option>
      {US_STATES.map(([c, n]) => (
        <option key={c} value={c}>
          {n} ({c})
        </option>
      ))}
    </select>
  );
}

const grid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";

export default function LeadEditor({
  id,
  initial,
  onCancel,
  onSaved,
}: {
  id: string;
  initial: Data;
  onCancel: () => void;
  onSaved: (d: Data) => void;
}) {
  const [d, setD] = useState<Driver>(initial.driver);
  const [x, setX] = useState<ExtraDriver[]>(initial.extraDrivers);
  const [v, setV] = useState<Vehicle[]>(initial.vehicles.length ? initial.vehicles : [emptyVehicle()]);
  const [c, setC] = useState<Coverage>(initial.coverage);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dv = (k: keyof Driver) => (e: { target: { value: string } }) => setD((p) => ({ ...p, [k]: e.target.value }));
  const ds = (k: keyof Driver) => (val: string) => setD((p) => ({ ...p, [k]: val }));
  const cs = (k: keyof Coverage) => (val: string) => setC((p) => ({ ...p, [k]: val }));

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await saveLeadEdits(id, { driver: d, extraDrivers: x, vehicles: v, coverage: c });
      if (r.ok) onSaved(r.lead);
      else setErr(r.error);
    });

  const section = "rounded-xl bg-black/20 p-4 flex flex-col gap-3";
  const h = "text-xs font-mono uppercase tracking-widest text-[#7cc4ff]";

  return (
    <div className="flex flex-col gap-4">
      <div className={section}>
        <p className={h}>Conductor principal</p>
        <div className={grid}>
          <F l="Nombre"><input className={inp} value={d.firstName} onChange={dv("firstName")} /></F>
          <F l="Apellido"><input className={inp} value={d.lastName} onChange={dv("lastName")} /></F>
          <F l="Nacimiento"><input type="date" className={inp} value={d.dob} onChange={dv("dob")} /></F>
          <F l="Correo"><input className={inp} value={d.email} onChange={dv("email")} /></F>
          <F l="Teléfono"><input className={inp} value={d.phone} onChange={dv("phone")} /></F>
          <F l="Género"><Opt group="gender" value={d.gender} onChange={ds("gender")} /></F>
          <F l="Estado civil"><Opt group="marital" value={d.marital} onChange={ds("marital")} /></F>
          <F l="Código postal"><input className={inp} value={d.zip} onChange={dv("zip")} /></F>
          <F l="Ciudad"><input className={inp} value={d.city} onChange={dv("city")} /></F>
          <F l="Estado"><StateSel value={d.state} onChange={ds("state")} /></F>
          <F l="Dirección" wide><input className={inp} value={d.street} onChange={dv("street")} /></F>
          <F l="Tipo de licencia"><Opt group="licenseStatus" value={d.licenseStatus} onChange={ds("licenseStatus")} /></F>
          <F l="Estado de licencia"><StateSel value={d.licenseState} onChange={ds("licenseState")} /></F>
          <F l="No. de licencia"><input className={inp} value={d.licenseNumber} onChange={dv("licenseNumber")} /></F>
          <F l="Años con licencia"><input className={inp} value={d.yearsLicensed} onChange={dv("yearsLicensed")} /></F>
          <F l="Accidentes (3 años)"><Opt group="count" value={d.accidents} onChange={ds("accidents")} /></F>
          <F l="Multas (3 años)"><Opt group="count" value={d.tickets} onChange={ds("tickets")} /></F>
          <F l="SR-22"><Opt group="yesno" value={d.sr22} onChange={ds("sr22")} /></F>
        </div>
      </div>

      <div className={section}>
        <div className="flex items-center justify-between">
          <p className={h}>Otros conductores</p>
          {x.length < 4 && (
            <button type="button" onClick={() => setX((p) => [...p, emptyExtraDriver()])} className="flex items-center gap-1 text-xs text-[#7cc4ff] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          )}
        </div>
        {x.length === 0 && <p className="text-sm text-sky-text/55">Ninguno.</p>}
        {x.map((e, i) => {
          const set = (k: keyof ExtraDriver) => (val: string) => setX((p) => p.map((q, j) => (j === i ? { ...q, [k]: val } : q)));
          return (
            <div key={i} className="flex flex-col gap-2 border-t border-white/10 pt-3 first:border-0 first:pt-0">
              <div className={grid}>
                <F l="Nombre"><input className={inp} value={e.firstName} onChange={(ev) => set("firstName")(ev.target.value)} /></F>
                <F l="Apellido"><input className={inp} value={e.lastName} onChange={(ev) => set("lastName")(ev.target.value)} /></F>
                <F l="Nacimiento"><input type="date" className={inp} value={e.dob} onChange={(ev) => set("dob")(ev.target.value)} /></F>
                <F l="Relación"><Opt group="relationship" value={e.relationship} onChange={set("relationship")} /></F>
                <F l="Licencia"><Opt group="licenseStatus" value={e.licenseStatus} onChange={set("licenseStatus")} /></F>
              </div>
              <button type="button" onClick={() => setX((p) => p.filter((_, j) => j !== i))} className="self-start flex items-center gap-1 text-xs text-sky-text/60 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5" /> Quitar conductor
              </button>
            </div>
          );
        })}
      </div>

      <div className={section}>
        <div className="flex items-center justify-between">
          <p className={h}>Vehículos</p>
          {v.length < 4 && (
            <button type="button" onClick={() => setV((p) => [...p, emptyVehicle()])} className="flex items-center gap-1 text-xs text-[#7cc4ff] hover:underline">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          )}
        </div>
        {v.map((e, i) => {
          const set = (k: keyof Vehicle) => (val: string) => setV((p) => p.map((q, j) => (j === i ? { ...q, [k]: val } : q)));
          return (
            <div key={i} className="flex flex-col gap-2 border-t border-white/10 pt-3 first:border-0 first:pt-0">
              <div className={grid}>
                <F l="Año"><input className={inp} value={e.year} maxLength={4} onChange={(ev) => set("year")(ev.target.value)} /></F>
                <F l="Marca"><input className={inp} value={e.make} onChange={(ev) => set("make")(ev.target.value)} /></F>
                <F l="Modelo"><input className={inp} value={e.model} onChange={(ev) => set("model")(ev.target.value)} /></F>
                <F l="VIN"><input className={inp + " font-mono"} value={e.vin} maxLength={17} onChange={(ev) => set("vin")(ev.target.value.toUpperCase())} /></F>
                <F l="Propiedad"><Opt group="ownership" value={e.ownership} onChange={set("ownership")} /></F>
                <F l="Uso"><Opt group="use" value={e.use} onChange={set("use")} /></F>
                <F l="Millas al año"><Opt group="miles" value={e.miles} onChange={set("miles")} /></F>
              </div>
              {v.length > 1 && (
                <button type="button" onClick={() => setV((p) => p.filter((_, j) => j !== i))} className="self-start flex items-center gap-1 text-xs text-sky-text/60 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" /> Quitar vehículo
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className={section}>
        <p className={h}>Cobertura</p>
        <div className={grid}>
          <F l="Seguro actual"><Opt group="insured" value={c.insured} onChange={cs("insured")} /></F>
          <F l="Aseguradora actual"><input className={inp} value={c.currentCarrier} onChange={(e) => cs("currentCarrier")(e.target.value)} /></F>
          <F l="Cobertura"><Opt group="level" value={c.level} onChange={cs("level")} /></F>
          <F l="Deducible"><Opt group="deductible" value={c.deductible} onChange={cs("deductible")} /></F>
          <F l="Inicio"><input type="date" className={inp} value={c.startDate} onChange={(e) => cs("startDate")(e.target.value)} /></F>
          <F l="Contactar por"><Opt group="contactPref" value={c.contactPref} onChange={cs("contactPref")} /></F>
          <F l="Notas" wide><textarea rows={2} className={inp + " resize-y"} value={c.notes} onChange={(e) => cs("notes")(e.target.value)} /></F>
        </div>
      </div>

      {err && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">{err}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onCancel} disabled={pending} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button type="button" onClick={save} disabled={pending} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-sm font-bold">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
        </button>
      </div>
    </div>
  );
}
