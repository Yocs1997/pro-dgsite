import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { resendReady } from "@/app/lib/server/resend";
import { listLocalContacts } from "@/app/lib/server/contacts";
import { stepStats } from "@/app/lib/server/mail-tracking";
import { listEnrollments, listSequences, nextFor, sequenceProblems, STOP_REASONS } from "@/app/lib/server/sequences";
import AdminNav from "../AdminNav";
import SequencesView, { type EnrollmentRow, type SequenceItem } from "./SequencesView";

export const metadata = { title: "Secuencias | Pro-DG" };

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function day(ts: number) {
  return new Date(ts).toLocaleDateString("es-NI", { timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric" });
}

export default async function SecuenciasPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");
  const sp = await searchParams;
  const openId = (Array.isArray(sp.id) ? sp.id[0] : sp.id) ?? "";

  const ready = dbReady();
  const safe = async <T,>(p: Promise<T>, fallback: T) => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [sequences, contacts] = ready ? await Promise.all([safe(listSequences(), []), safe(listLocalContacts(), [])]) : [[], []];

  const counts = new Map<string, number>();
  for (const c of contacts) for (const s of c.segments) counts.set(s, (counts.get(s) ?? 0) + 1);
  const segments = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));

  const now = Date.now();
  const items: SequenceItem[] = await Promise.all(
    sequences.map(async (seq) => {
      const [enrollments, stats] = await Promise.all([
        safe(listEnrollments(seq.id), []),
        safe(stepStats(seq.id, seq.steps.map((s) => s.id)), {}),
      ]);
      let lastSent = 0;
      let nextAt = 0;
      let sentTotal = 0;
      const rows: EnrollmentRow[] = enrollments.map((e) => {
        sentTotal += e.sent.length;
        lastSent = Math.max(lastSent, e.lastSentAt);
        const next = e.status === "active" ? nextFor(seq, e) : null;
        if (next) nextAt = nextAt ? Math.min(nextAt, next.at) : next.at;
        return {
          email: e.email,
          firstName: e.firstName,
          source: e.source,
          lang: e.lang,
          status: e.status,
          reason: e.stopReason ? STOP_REASONS[e.stopReason] ?? e.stopReason : "",
          sent: e.sent.length,
          enrolled: when(e.enrolledAt),
          next: next ? (next.at <= now ? "En el próximo envío" : when(next.at)) : "",
        };
      });
      const lastDay = Math.max(0, ...seq.steps.map((s) => s.day));
      return {
        sequence: seq,
        problems: sequenceProblems(seq),
        stats,
        enrollments: rows,
        summary: {
          created: day(seq.createdAt),
          updated: when(seq.updatedAt),
          lastSent: lastSent ? when(lastSent) : "",
          nextSend: nextAt ? (nextAt <= now ? "En el próximo envío" : when(nextAt)) : "",
          sentTotal,
          lastDay,
        },
      };
    })
  );

  return (
    <>
      <AdminNav active="/agentes/secuencias" />
      <SequencesView
        items={items}
        openId={openId}
        segments={segments}
        setup={{ db: ready, resend: resendReady(), cron: Boolean(process.env.CRON_SECRET), replyTo: Boolean(process.env.MAIL_REPLY_TO) }}
      />
    </>
  );
}
