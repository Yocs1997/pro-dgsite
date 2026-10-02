import "server-only";
import type { Sequence, Step } from "./sequences";

// Starting copy for leads who asked for tags (placas) on the Meta form. What it says
// comes from the office: to start we need a photo of the title (front and back) and of
// the ID; next steps come once we confirm the title can be used; nothing is paid up
// front (they pay when they get their tags); the office is in Baltimore.
// Voice: plain and neighborly, short sentences, everyday words (the way the office's
// customers talk), nothing formal.
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
        subject: { en: "{{name|Hey}}, got your {{product}} request", es: "{{name|Hola}}, ya vi tu solicitud de {{product}}" },
        preview: { en: "Send me 2 photos and we get started", es: "Mándame 2 fotos y empezamos" },
        body: {
          en: `Hi {{name}},

It's {{agent}} from Car Tag & Registration Services, here in Baltimore. I saw you need {{product}}. I can help you with that.

To start, just send me 2 photos:
1. Your title, front and back.
2. Your ID.

Send them here (just reply to this email) or text them to {{phone}}.

I'll check your title and let you know if it works and what's next. You don't pay anything now. You pay when you have your tags in hand.

Any questions, call or text me.

{{agent}}
Car Tag & Registration Services · Hablamos español.`,
          es: `Hola {{name}},

Soy {{agent}}, de Car Tag & Registration Services, aquí en Baltimore. Ya vi que necesitas {{product}}. Yo te ayudo con eso.

Para empezar solo mándame 2 fotos:
1. Tu título, por delante y por detrás.
2. Tu ID.

Mándalas por aquí (solo responde este correo) o por mensaje de texto al {{phone}}.

Yo reviso tu título y te aviso si sirve y qué sigue. No pagas nada ahorita. Pagas hasta que tengas tus placas en la mano.

Cualquier duda, llámame o escríbeme.

{{agent}}
Car Tag & Registration Services · We speak English too.`,
        },
        button: { en: "", es: "" },
      }),
      step("t2", 2, {
        subject: { en: "{{name|Hey}}, got your title handy?", es: "{{name|Oye}}, ¿tienes tu título a la mano?" },
        preview: { en: "2 photos and we get started", es: "Con 2 fotos empezamos" },
        body: {
          en: `Hi {{name}},

I wrote you a couple days ago about {{product}}.

I only need 2 photos to get started: your title (front and back) and your ID. Take them with your phone and send them here or text them to {{phone}}.

Don't have the title, or not sure it's the right paper? Don't worry. Send me a photo of what you have and I'll tell you if it works.

{{agent}}
Car Tag & Registration Services · {{phone}}`,
          es: `Hola {{name}},

Te escribí hace unos días por lo de {{product}}.

Solo me faltan 2 fotos para empezar: tu título (por delante y por detrás) y tu ID. Tómalas con tu teléfono y mándamelas por aquí o por texto al {{phone}}.

¿No tienes el título, o no sabes si es el papel correcto? No te preocupes. Mándame foto de lo que tengas y yo te digo si sirve.

{{agent}}
Car Tag & Registration Services · {{phone}}`,
        },
        button: { en: "", es: "" },
      }),
      step("t3", 5, {
        subject: { en: "You don't pay until you have your tags", es: "No pagas nada hasta tener tus placas" },
        preview: { en: "Here's how easy it is", es: "Así de fácil funciona" },
        body: {
          en: `Hi {{name}},

Real quick, here's how it works for {{product}}:

1. You send me a photo of your title (both sides) and your ID.
2. I check that the title works.
3. I tell you what's next.
4. You pay when you have your tags. Not before.

We're in Baltimore and we speak English and Spanish.

To start, send me the photos here or text them to {{phone}}.

{{agent}}
Car Tag & Registration Services`,
          es: `Hola {{name}},

Te explico rápido cómo funciona lo de {{product}}:

1. Me mandas foto de tu título (los dos lados) y de tu ID.
2. Yo reviso que el título sirva.
3. Te digo qué sigue.
4. Pagas cuando ya tengas tus placas. Antes no.

Estamos en Baltimore y hablamos español.

Para empezar, mándame las fotos por aquí o por texto al {{phone}}.

{{agent}}
Car Tag & Registration Services`,
        },
        button: { en: "", es: "" },
      }),
      step("t4", 9, {
        subject: { en: "{{name|Hey}}, still interested?", es: "{{name|Oye}}, ¿todavía te interesa?" },
        preview: { en: "Just answer with a number", es: "Solo respóndeme con un número" },
        body: {
          en: `Hi {{name}},

I haven't heard from you. Maybe you already took care of it, or it's not a good time. That's okay.

Just answer me with a number:

1 — Yes, I still want it. Call me.
2 — Not now. Write me later.
3 — I don't need it anymore.

Thanks for thinking of us.

{{agent}}
Car Tag & Registration Services · {{phone}}`,
          es: `Hola {{name}},

No he sabido de ti. A lo mejor ya lo resolviste o no es buen momento. No pasa nada.

Solo respóndeme con un número:

1 — Sí lo quiero. Llámame.
2 — Ahora no. Escríbeme más adelante.
3 — Ya no lo necesito.

Gracias por tomarnos en cuenta.

{{agent}}
Car Tag & Registration Services · {{phone}}`,
        },
        button: { en: "", es: "" },
      }),
    ],
  };
}
