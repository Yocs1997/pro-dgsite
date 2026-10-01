"use client";

import { useState } from "react";
import { Check, PhoneCall } from "lucide-react";

// Phone2 (the office phone, app.phone2.io) has no link that opens its dialer with a
// number filled in, so this copies the number and brings the Phone2 tab forward:
// paste (Ctrl+V) in its dialer and call.

const PHONE2_URL = "https://app.phone2.io/";

/** +1XXXXXXXXXX for US numbers, +505XXXXXXXX for 8-digit Nicaraguan ones. */
export function dialNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 8) return `+505${d}`;
  return d ? `+${d}` : "";
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

/** Focuses the Phone2 tab if this browser already opened one; otherwise opens it. Never reloads it (a call may be in progress). */
function showPhone2() {
  const w = window.open("", "phone2");
  if (!w) return;
  let blank = false;
  try {
    blank = w.location.href === "about:blank";
  } catch {
    /* already on Phone2 (another site): leave it as is */
  }
  if (blank) w.location.href = PHONE2_URL;
  w.focus();
}

export default function Phone2Button({ phone, className }: { phone: string; className?: string }) {
  const [done, setDone] = useState(false);
  const number = dialNumber(phone);
  if (!number) return null;
  const go = async () => {
    const ok = await copy(number);
    setDone(ok);
    if (ok) setTimeout(() => setDone(false), 6000);
    showPhone2();
  };
  return (
    <button
      type="button"
      onClick={go}
      title={`Copia ${number} y abre Phone2: pégalo en el marcador (Ctrl+V)`}
      className={className ?? "flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm"}
    >
      {done ? <Check className="w-4 h-4 text-emerald-300" /> : <PhoneCall className="w-4 h-4" />}
      {done ? `Copiado ${number}: pégalo en Phone2` : "Llamar con Phone2"}
    </button>
  );
}
