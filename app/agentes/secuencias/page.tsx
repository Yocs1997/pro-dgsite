import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { resendReady } from "@/app/lib/server/resend";
import { listLocalContacts } from "@/app/lib/server/contacts";
import { stepStats } from "@/app/lib/server/mail-tracking";
import { listEnrollments, listSequences, nextFor, sequenceProblems, STOP_REASONS } from "@/app/lib/server/sequences";
import AdminNav from "../AdminNav";
import SequencesView, { type EnrollmentRow } from "./SequencesView";

export const metadata = { title: "Secuencias | Pro-DG" };

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SecuenciasPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");
  const sp = await searchParams;
  const wanted = (Array.isArray(sp.id) ? sp.id[0] : sp.id) ?? "";

  const ready = dbReady();
  const safe = async <T,>(p: Promise<T>, fallback: T) => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [sequences, contacts] = ready ? await Promise.all([safe(listSequences(), []), safe(listLocalContacts(), [])]) : [[], []];
  const seq = sequences.find((s) => s.id === wanted) ?? sequences[0] ?? null;
  const enrollments = seq ? await safe(listEnrollments(seq.id), []) : [];
  const stats = seq ? await safe(stepStats(seq.id, seq.steps.map((s) => s.id)), {}) : {};

  const counts = new Map<string, number>();
  for (const c of contacts) for (const s of c.segments) counts.set(s, (counts.get(s) ?? 0) + 1);
  const segments = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));

  const rows: EnrollmentRow[] = seq
    ? enrollments.map((e) => {
        const next = e.status === "active" ? nextFor(seq, e) : null;
        return {
          email: e.email,
          firstName: e.firstName,
          source: e.source,
          lang: e.lang,
          status: e.status,
          reason: e.stopReason ? STOP_REASONS[e.stopReason] ?? e.stopReason : "",
          sent: e.sent.length,
          enrolled: when(e.enrolledAt),
          next: next ? (next.at <= Date.now() ? "En el próximo envío" : when(next.at)) : "",
        };
      })
    : [];

  return (
    <>
      <AdminNav active="/agentes/secuencias" />
      <SequencesView
        key={seq?.id ?? "none"}
        list={sequences.map((s) => ({ id: s.id, name: s.name, active: s.active }))}
        sequence={seq}
        problems={seq ? sequenceProblems(seq) : []}
        stats={stats}
        segments={segments}
        enrollments={rows}
        setup={{ db: ready, resend: resendReady(), cron: Boolean(process.env.CRON_SECRET), replyTo: Boolean(process.env.MAIL_REPLY_TO) }}
      />
    </>
  );
}
