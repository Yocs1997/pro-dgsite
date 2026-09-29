import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { resendReady, mailFrom, mailReplyTo } from "@/app/lib/server/resend";
import { listCampaigns, listInMail, listOutMail } from "@/app/lib/server/mail";
import { listLocalContacts } from "@/app/lib/server/contacts";
import AdminNav from "../AdminNav";
import MailCenter from "./MailCenter";

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
    webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET),
  };

  const safe = async <T,>(p: Promise<T>, fallback: T) => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [inbox, sent, campaigns, contacts] = setup.db
    ? await Promise.all([safe(listInMail(), []), safe(listOutMail(), []), safe(listCampaigns(), []), safe(listLocalContacts(), [])])
    : [[], [], [], []];

  const unread = inbox.filter((m) => !m.read).length;

  return (
    <>
      <AdminNav active="/agentes/correo" badges={{ "/agentes/correo": unread }} />
      <MailCenter
        setup={setup}
        inbox={inbox.map((m) => ({ ...m, when: when(m.createdAt) }))}
        sent={sent.map((m) => ({ ...m, when: when(m.createdAt) }))}
        campaigns={campaigns.map((c) => ({ ...c, when: when(c.createdAt) }))}
        contacts={contacts}
        compose={{ to: one(sp.to), subject: one(sp.subject) }}
        adminName={user.name}
      />
    </>
  );
}
