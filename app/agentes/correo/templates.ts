// Ready-made one-to-one emails for Correo → Redactar. Pick one and the subject and
// message are filled in; everything stays editable before sending.
//   {name}  → the contact's first name (dropped if unknown)
//   {agent} → the person sending (portal user)

export type TemplateLang = "en" | "es";
type Text = { subject: string; body: string };
export type MailTemplate = { id: string; label: string; en: Text; es: Text };

const COMPANY = "Car Tag & Registration Services";
const PHONE = "(240) 256-6360";

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: "missed-call",
    label: "No contestó la llamada",
    en: {
      subject: "We tried calling you about your car insurance quote",
      body: `Hi {name},

I just tried calling you about the car insurance quote you requested, but I couldn't reach you.

I only need to confirm a couple of details to finish your quote. It takes about 5 minutes.

You can call me back at ${PHONE}, or reply to this email with a good time to reach you.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Intentamos llamarte por tu cotización de seguro de auto",
      body: `Hola {name},

Acabo de llamarte por la cotización de seguro de auto que solicitaste, pero no pude comunicarme contigo.

Solo necesito confirmar un par de datos para terminar tu cotización. Toma unos 5 minutos.

Puedes devolverme la llamada al ${PHONE}, o responder a este correo con una buena hora para llamarte.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "second-attempt",
    label: "Segundo intento (sigue sin contestar)",
    en: {
      subject: "Still want your car insurance quote?",
      body: `Hi {name},

I've tried to reach you a couple of times about your car insurance quote and haven't been able to connect.

If you're still interested, call me at ${PHONE} or reply here with the best time to call you, and I'll take care of the rest.

If you already found coverage, just let me know and I'll close your request.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "¿Todavía quieres tu cotización de seguro de auto?",
      body: `Hola {name},

He intentado comunicarme contigo un par de veces por tu cotización de seguro de auto y no lo he logrado.

Si sigues interesado, llámame al ${PHONE} o responde aquí con la mejor hora para llamarte, y yo me encargo del resto.

Si ya conseguiste seguro, solo avísame y cierro tu solicitud.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "need-info",
    label: "Falta información para cotizar",
    en: {
      subject: "One more detail to finish your car insurance quote",
      body: `Hi {name},

Thank you for requesting a car insurance quote. To finish it, I still need:

-

You can reply to this email with it, or call me at ${PHONE}.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Falta un dato para terminar tu cotización de seguro de auto",
      body: `Hola {name},

Gracias por solicitar una cotización de seguro de auto. Para terminarla todavía necesito:

-

Puedes responder a este correo con ese dato, o llamarme al ${PHONE}.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "quote-follow-up",
    label: "Seguimiento después de la cotización",
    en: {
      subject: "Any questions about your car insurance quote?",
      body: `Hi {name},

I wanted to follow up on the car insurance quote I sent you. Do you have any questions, or is there anything you'd like me to adjust?

You can reply to this email or call me at ${PHONE}.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "¿Tienes preguntas sobre tu cotización de seguro de auto?",
      body: `Hola {name},

Quería dar seguimiento a la cotización de seguro de auto que te envié. ¿Tienes alguna pregunta, o hay algo que quieras que ajuste?

Puedes responder a este correo o llamarme al ${PHONE}.

Gracias,
{agent}
${COMPANY}`,
    },
  },
];

/** Fills {name} and {agent}; with no name the greeting becomes "Hi," / "Hola,". */
export function fillTemplate(t: Text, v: { name?: string; agent: string }): Text {
  const name = (v.name ?? "").trim();
  const fill = (s: string) => s.replace(/ ?\{name\}/g, name ? ` ${name}` : "").replace(/\{agent\}/g, v.agent.trim());
  return { subject: fill(t.subject), body: fill(t.body) };
}
