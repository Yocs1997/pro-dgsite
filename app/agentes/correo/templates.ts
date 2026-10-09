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
  {
    // The ___ are filled in by hand before sending (the composer won't send while any are left).
    id: "insurance-quote",
    label: "Cotización de seguro de auto (llenar datos)",
    en: {
      subject: "Your car insurance quote is ready, {name}",
      body: `Hi {name},

Your car insurance quote is ready. Here it is:

Company: ___
Coverage: ___
Vehicle: ___
Down payment: $___
Monthly payment: $___
Policy length: ___ months
Can start on: ___

To get it going, just tell me yes and we take care of the down payment. Call or text me at ${PHONE}, or reply to this email.

If you want me to look at another option (another company, a different deductible or less coverage), let me know and I'll find it for you.

Thank you,
{agent}
${COMPANY}`,
    },
    es: {
      subject: "Tu cotización de seguro de auto está lista, {name}",
      body: `Hola {name},

Ya tengo tu cotización de seguro de auto. Aquí está:

Compañía: ___
Cobertura: ___
Vehículo: ___
Pago inicial: $___
Pago mensual: $___
Póliza por: ___ meses
Puede empezar: ___

Para activarla solo dime que sí y hacemos el pago inicial. Llámame o escríbeme al ${PHONE}, o responde este correo.

Si quieres que te busque otra opción (otra compañía, otro deducible o menos cobertura), dime y te la consigo.

Gracias,
{agent}
${COMPANY}`,
    },
  },
  {
    // Prices, times and requirements as given by the office (Oct 2026). Update here if they change.
    id: "md-tags-info",
    label: "Información de placas de Maryland (precios)",
    en: {
      subject: "Everything you need to know about Maryland tags",
      body: `Hi {name},

As we talked, here's all the info about Maryland tags so you have it when you're ready.

First thing: to get tags for 1 year or more, the car needs the inspection. We can get it for you.

This is how it works:

Step 1: $550
We give you metal Maryland plates with 30-day stickers, so you can drive legally while we work on the inspection. You get the plates the same day.

Step 2: $650 more
Once we have the inspection (it takes up to a week), we give you the inspection plus the stickers for a year.

That's $1,200 in total.

What you need:
- A picture of your ID
- Your original title

Address: 4000 Glengyle Ave, Baltimore, Maryland

When you're ready, call or text me at ${PHONE}.

{agent}
${COMPANY}`,
    },
    es: {
      subject: "Toda la información de las placas de Maryland",
      body: `Hola {name},

Como hablamos, aquí te mando toda la información de las placas de Maryland para cuando estés listo.

Primero: para sacar placas por 1 año o más, el carro necesita la inspección. Nosotros te la conseguimos.

Así funciona:

Paso 1: $550
Te damos placas de metal de Maryland con stickers de 30 días, para que puedas manejar legal mientras trabajamos en la inspección. Las placas te las damos el mismo día.

Paso 2: $650 más
Cuando ya tengamos la inspección (tarda hasta una semana), te damos la inspección y los stickers por un año.

En total son $1,200.

Lo que necesitas:
- Una foto de tu ID
- Tu título original

Dirección: 4000 Glengyle Ave, Baltimore, Maryland

Cuando estés listo, llámame o escríbeme al ${PHONE}.

{agent}
${COMPANY}`,
    },
  },
  {
    // Price, time and requirements as given by the office (Oct 2026). Update here if they change.
    id: "va-temp-tags-info",
    label: "Información de placas temporales de Virginia (precio)",
    en: {
      subject: "Virginia temporary tags: price and what we need",
      body: `Hi {name},

Thanks for reaching out about Virginia temporary tags. Here's everything you need to know.

Price: $250
They're good for 30 days.

What you need to send us:
- A picture of your ID
- A picture of your registration

We have them ready the same day.

How you get them:
- If you're in Maryland, you pick them up at our office: 4000 Glengyle Ave, Baltimore, Maryland.
- If you're anywhere else, we ship them to you. Shipping is paid by you.

When you're ready, just reply to this email with the pictures, or call or text me at ${PHONE}.

{agent}
${COMPANY}`,
    },
    es: {
      subject: "Placas temporales de Virginia: precio y lo que necesitamos",
      body: `Hola {name},

Gracias por escribirnos por las placas temporales de Virginia. Aquí te mando toda la información.

Precio: $250
Son válidas por 30 días.

Lo que necesitas mandarnos:
- Una foto de tu ID
- Una foto del registro de tu carro

Te las tenemos listas el mismo día.

Cómo las recibes:
- Si estás en Maryland, las recoges en nuestra oficina: 4000 Glengyle Ave, Baltimore, Maryland.
- Si estás en otro lugar, te las enviamos por correo. El envío lo pagas tú.

Cuando estés listo, solo responde este correo con las fotos, o llámame o escríbeme al ${PHONE}.

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
