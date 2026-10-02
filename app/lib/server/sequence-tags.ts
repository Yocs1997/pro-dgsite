import "server-only";
import type { Sequence, Step } from "./sequences";

// Starting copy for leads who asked for tags (placas) on the Meta form. What it says
// comes from the office: to start we need a photo of the title (front and back) and of
// the ID; next steps come once we confirm the title can be used; nothing is paid up
// front (they pay when they get their tags); the office is in Baltimore.
// {{product}} is what the lead picked ("Virginia tags" / "placas de Virginia").

const step = (id: string, day: number, s: Omit<Step, "id" | "day" | "audience">): Step => ({ id, day, audience: "all", ...s });

export function defaultTagsSequence(now = Date.now()): Sequence {
  return {
    id: `seq-${now.toString(36)}`,
    name: "Seguimiento de placas (tags)",
    active: false,
    autoEnrollForm: false,
    formFor: "tags",
    company: "Car Tag & Registration Services",
    agentName: "",
    phone: "(240) 256-6360",
    buttonUrl: "https://www.pro-dg.com/seguros",
    createdAt: now,
    updatedAt: now,
    steps: [
      step("t1", 0, {
        subject: { en: "Got your {{product}} request, {{name|there}}", es: "Recibimos tu solicitud de {{product}}, {{name|hola}}" },
        preview: { en: "Two photos and we can get started", es: "Dos fotos y podemos empezar" },
        body: {
          en: `Hi {{name}},

This is {{agent}} from Car Tag & Registration Services in Baltimore. I got your request for {{product}}. Thank you for reaching out.

To get started, I only need two things:
1. A photo of your vehicle title, front and back.
2. A photo of your ID.

You can reply to this email with the photos, or text them to {{phone}}.

Once we confirm we can work with your title, I'll tell you the next steps. There is no payment up front: you pay when you get your tags.

Talk soon,
{{agent}}, Car Tag & Registration Services · Hablamos español.`,
          es: `Hola {{name}},

Soy {{agent}}, de Car Tag & Registration Services en Baltimore. Recibí tu solicitud de {{product}}. Gracias por escribirnos.

Para empezar solo necesito dos cosas:
1. Una foto del título de tu vehículo, por delante y por detrás.
2. Una foto de tu identificación.

Puedes responder a este correo con las fotos, o enviarlas por mensaje al {{phone}}.

En cuanto confirmemos que podemos trabajar con tu título, te digo los siguientes pasos. No se paga nada por adelantado: pagas cuando recibes tus placas.

Hablamos pronto,
{{agent}}, Car Tag & Registration Services · We speak English too.`,
        },
        button: { en: "", es: "" },
      }),
      step("t2", 2, {
        subject: { en: "{{name|Quick question}}, do you have your title handy?", es: "{{name|Una pregunta}}, ¿tienes tu título a la mano?" },
        preview: { en: "It's the one thing we need to start", es: "Es lo único que necesitamos para empezar" },
        body: {
          en: `Hi {{name}},

I'm following up on your request for {{product}}.

The only thing we need to start is two photos: your vehicle title (front and back) and your ID. You can take them with your phone and reply to this email, or text them to {{phone}}.

If you don't have the title with you, or you're not sure it's the right document, reply and tell me what you have. I'll let you know if we can work with it.

{{agent}}, Car Tag & Registration Services · {{phone}}`,
          es: `Hola {{name}},

Te escribo para dar seguimiento a tu solicitud de {{product}}.

Lo único que necesitamos para empezar son dos fotos: el título de tu vehículo (por delante y por detrás) y tu identificación. Puedes tomarlas con tu teléfono y responder a este correo, o enviarlas por mensaje al {{phone}}.

Si no tienes el título contigo, o no estás seguro de que sea el documento correcto, respóndeme y cuéntame qué tienes. Yo te digo si podemos trabajar con eso.

{{agent}}, Car Tag & Registration Services · {{phone}}`,
        },
        button: { en: "", es: "" },
      }),
      step("t3", 5, {
        subject: { en: "No payment until you have your tags", es: "No pagas nada hasta tener tus placas" },
        preview: { en: "How it works, step by step", es: "Cómo funciona, paso a paso" },
        body: {
          en: `Hi {{name}},

In case it helps, this is how your request for {{product}} works with us:

1. You send a photo of your title (front and back) and of your ID.
2. We confirm that we can work with your title.
3. We tell you the next steps.
4. You pay when you get your tags. Nothing up front.

We're in Baltimore and we help in English and Spanish.

To start, reply to this email with the photos or text them to {{phone}}.

{{agent}}, Car Tag & Registration Services`,
          es: `Hola {{name}},

Por si te ayuda, así funciona tu solicitud de {{product}} con nosotros:

1. Nos envías una foto de tu título (por delante y por detrás) y de tu identificación.
2. Confirmamos que podemos trabajar con tu título.
3. Te decimos los siguientes pasos.
4. Pagas cuando recibes tus placas. Nada por adelantado.

Estamos en Baltimore y atendemos en español e inglés.

Para empezar, responde a este correo con las fotos o envíalas por mensaje al {{phone}}.

{{agent}}, Car Tag & Registration Services`,
        },
        button: { en: "", es: "" },
      }),
      step("t4", 9, {
        subject: { en: "Should I close your request?", es: "¿Cierro tu solicitud?" },
        preview: { en: "No problem either way", es: "Sin problema, decidas lo que decidas" },
        body: {
          en: `Hi {{name}},

I haven't heard back, so I'm guessing the timing isn't right, or you already took care of it. No problem.

Before I close your request for {{product}}, could you reply with just a number?

1 — Yes, I still want it. Call me.
2 — Not now, check back in a few months.
3 — I'm all set, close my request.

Whatever you decide, thank you for considering us.

{{agent}}, Car Tag & Registration Services · {{phone}}`,
          es: `Hola {{name}},

No he sabido de ti, así que supongo que no es el momento, o ya lo resolviste. No hay problema.

Antes de cerrar tu solicitud de {{product}}, ¿me respondes solo con un número?

1 — Sí, todavía lo quiero. Llámame.
2 — Ahora no, escríbeme en unos meses.
3 — Ya estoy listo, cierra mi solicitud.

Decidas lo que decidas, gracias por tenernos en cuenta.

{{agent}}, Car Tag & Registration Services · {{phone}}`,
        },
        button: { en: "", es: "" },
      }),
    ],
  };
}
