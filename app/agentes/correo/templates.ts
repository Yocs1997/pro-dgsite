// Ready-made one-to-one emails for Correo → Redactar. Pick one and the subject and
// message are filled in; everything stays editable before sending.
//   {name}    → becomes {nombre} in the composer; when the email is sent, each recipient
//               gets their own first name there (dropped if unknown)
//   {product} → becomes {producto}; when sent, it is the service that person asked for
//               (from their lead), e.g. "Virginia tags"
//   {agent}   → the person sending (portal user)

import type { ServiceLang } from "@/app/lib/lead-service";
export { DEFAULT_PRODUCT, productLabel, serviceFromNotes } from "@/app/lib/lead-service";

export type TemplateLang = ServiceLang;
type Text = { subject: string; body: string };
export type MailTemplate = { id: string; label: string; en: Text; es: Text };

const COMPANY = "Car Tag & Registration Services";
const PHONE = "(240) 256-6360";

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: "missed-call",
    label: "No contestó la llamada",
    en: {
      subject: "We tried calling you about {product}",
      body: `Hi {name},

I just tried calling you about your request for {product}, but I couldn't reach you.

I only need to confirm a couple of details to get it started. It takes about 5 minutes.

You can call me back at ${PHONE}, or reply to this email with a good time to reach you.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Intentamos llamarte por tu solicitud de {product}",
      body: `Hola {name},

Acabo de llamarte por tu solicitud de {product}, pero no pude comunicarme contigo.

Solo necesito confirmar un par de datos para empezar. Toma unos 5 minutos.

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
      subject: "Still need help with {product}?",
      body: `Hi {name},

I've tried to reach you a couple of times about your request for {product} and haven't been able to connect.

If you're still interested, call me at ${PHONE} or reply here with the best time to call you, and I'll take care of the rest.

If you no longer need it, just let me know and I'll close your request.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "¿Todavía necesitas ayuda con {product}?",
      body: `Hola {name},

He intentado comunicarme contigo un par de veces por tu solicitud de {product} y no lo he logrado.

Si sigues interesado, llámame al ${PHONE} o responde aquí con la mejor hora para llamarte, y yo me encargo del resto.

Si ya no lo necesitas, solo avísame y cierro tu solicitud.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "need-info",
    label: "Falta información para continuar",
    en: {
      subject: "One more detail for your {product} request",
      body: `Hi {name},

Thank you for your request for {product}. To continue, I still need:

-

You can reply to this email with it, or call me at ${PHONE}.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Falta un dato para tu solicitud de {product}",
      body: `Hola {name},

Gracias por tu solicitud de {product}. Para continuar todavía necesito:

-

Puedes responder a este correo con ese dato, o llamarme al ${PHONE}.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "info-received",
    label: "Recibí sus datos (cotización en 45–90 min)",
    en: {
      subject: "Got your info: your {product} quote is on the way",
      body: `Hi {name},

I got your info, thank you. I'm already working on your {product} quote.

I'll get back to you with it in 45 to 90 minutes.

If anything changes or you have a question in the meantime, just reply to this email or call me at ${PHONE}.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Ya tengo tus datos: tu cotización de {product} va en camino",
      body: `Hola {name},

Ya recibí tus datos, gracias. Ya estoy trabajando en tu cotización de {product}.

Te la mando en 45 a 90 minutos.

Si algo cambia o tienes alguna pregunta mientras tanto, responde este correo o llámame al ${PHONE}.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    id: "quote-follow-up",
    label: "Seguimiento después de la cotización",
    en: {
      subject: "Any questions about your {product} quote?",
      body: `Hi {name},

I wanted to follow up on the quote I sent you for {product}. Do you have any questions, or is there anything you'd like me to adjust?

You can reply to this email or call me at ${PHONE}.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "¿Tienes preguntas sobre tu cotización de {product}?",
      body: `Hola {name},

Quería dar seguimiento a la cotización de {product} que te envié. ¿Tienes alguna pregunta, o hay algo que quieras que ajuste?

Puedes responder a este correo o llamarme al ${PHONE}.

Gracias,
{agent}
${COMPANY}`,
    },
  },
];

/** Tokens left in the composer; each recipient gets their own values when the email is sent. */
export const NAME_TOKEN = "{nombre}";
export const PRODUCT_TOKEN = "{producto}";

/** Fills {agent} and leaves {nombre} / {producto} for the moment of sending. */
export function fillTemplate(t: Text, v: { agent: string }): Text {
  const fill = (s: string) => s.replace(/\{name\}/g, NAME_TOKEN).replace(/\{product\}/g, PRODUCT_TOKEN).replace(/\{agent\}/g, v.agent.trim());
  return { subject: fill(t.subject), body: fill(t.body) };
}

/** Puts one person's values in: with no name "Hi {nombre}," becomes "Hi,". */
export function personalize(text: string, v: { name?: string; product?: string }): string {
  const name = (v.name ?? "").trim();
  return text.replace(/ ?\{nombre\}/gi, name ? ` ${name}` : "").replace(/\{producto\}/gi, (v.product ?? "").trim());
}
