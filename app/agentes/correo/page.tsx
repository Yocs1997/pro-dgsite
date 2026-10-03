import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { resendReady, mailFrom, mailReplyTo } from "@/app/lib/server/resend";
import { telegramReady } from "@/app/lib/server/telegram";
import { listCampaigns, listInMail, listOutMail } from "@/app/lib/server/mail";
import { listLocalContacts } from "@/app/lib/server/contacts";
import { listLeads } from "@/app/lib/server/insurance";
import { leadService } from "@/app/lib/lead-service";
import AdminNav from "../AdminNav";
import MailCenter from "./MailCenter";
import { signatureFor } from "@/app/lib/server/team-phones";

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default async function CorreoPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const setup = {
    resend: resendReady(),
    db: dbReady(),
    from: mailFrom(),
    replyTo: mailReplyTo() ?? "",
    postal: Boolean(process.env.MAIL_POSTAL_ADDRESS),
    postalAddress: process.env.MAIL_POSTAL_ADDRESS ?? "",
    webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    telegram: telegramReady(),
  };

  const safe = async <T,>(p: Promise<T>, fallback: T) => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [inbox, sent, campaigns, contacts, leads] = setup.db
    ? await Promise.all([safe(listInMail(), []), safe(listOutMail(), []), safe(listCampaigns(), []), safe(listLocalContacts(), []), safe(listLeads(), [])])
    : [[], [], [], [], []];

  // What each lead asked for (the form's "which service" answer), by email, so email
  // templates talk about that service. The most recent lead wins.
  const services: Record<string, string> = {};
  for (const l of [...leads].sort((a, b) => a.createdAt - b.createdAt)) {
    const email = l.driver?.email?.trim().toLowerCase();
    const service = leadService(l);
    if (email && service) services[email] = service;
  }

  return (
    <>
      <AdminNav active="/agentes/correo" />
      <MailCenter
        setup={setup}
        inbox={inbox.map((m) => ({ ...m, when: when(m.createdAt) }))}
        sent={sent.map((m) => ({ ...m, when: when(m.createdAt) }))}
        campaigns={campaigns.map((c) => ({ ...c, when: when(c.createdAt) }))}
        contacts={contacts}
        compose={{ to: one(sp.to), subject: one(sp.subject) }}
        services={services}
        adminName={(await signatureFor(user.u).catch(() => null)) || user.name}
      />
    </>
  );
}
