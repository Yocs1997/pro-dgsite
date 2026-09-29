import "server-only";
import type { Sequence, Step } from "./sequences";

// Starting copy for the car-insurance follow-up sequence (from the "Car Insurance Quote
// Email Sequence" plan, without any mention of the service fee). Everything is editable
// in the portal. Tokens: {{name}} {{vehicle}} {{state}} {{agent}} {{phone}}; add a custom
// fallback with {{name|Quick question}}. A paragraph that is only [button] places the button.

const step = (id: string, day: number, audience: Step["audience"], s: Omit<Step, "id" | "day" | "audience">): Step => ({ id, day, audience, ...s });

export function defaultInsuranceSequence(now = Date.now()): Sequence {
  return {
    id: `seq-${now.toString(36)}`,
    name: "Seguimiento de cotización de auto",
    active: false,
    autoEnrollForm: false,
    company: "Car Tag & Registration Services",
    agentName: "",
    phone: "(240) 256-6360",
    buttonUrl: "https://www.pro-dg.com/seguros",
    createdAt: now,
    updatedAt: now,
    steps: [
      step("e1", 0, "all", {
        subject: { en: "Got your quote request, {{name|there}}", es: "Recibimos tu solicitud, {{name|hola}}" },
        preview: { en: "Here's what happens next (and how long it takes)", es: "Esto es lo que sigue (y cuánto tarda)" },
        body: {
          en: `Hi {{name}},

This is {{agent}} from Car Tag & Registration Services. I got your request for a car insurance quote for {{vehicle}}. Thank you for trusting us with it.

Here's how it works from here:
1. We compare for you. Instead of you calling one company after another, we check the carriers available in {{state}} at the same time. Think Progressive, GEICO, State Farm, Allstate, and more.
2. You see the lowest rates side by side. Usually in less than an hour.
3. You pick. Or you don't. No pressure, ever.

The fastest way to finish is a quick call or text. I'll have a couple of questions to lock in your best price.

[button]

Or call or text me at {{phone}}.

Talk soon,
{{agent}}, Car Tag & Registration Services · Hablamos español.`,
          es: `Hola {{name}},

Soy {{agent}}, de Car Tag & Registration Services. Recibí tu solicitud de cotización de seguro para {{vehicle}}. Gracias por confiar en nosotros.

Así funciona a partir de ahora:
1. Comparamos por ti. En lugar de que llames a una compañía tras otra, revisamos al mismo tiempo las aseguradoras disponibles en {{state}}: Progressive, GEICO, State Farm, Allstate y más.
2. Ves las tarifas más bajas lado a lado. Normalmente en menos de una hora.
3. Tú eliges. O no. Sin presión, nunca.

La forma más rápida de terminar es una llamada o un mensaje de texto. Tendré un par de preguntas para asegurar tu mejor precio.

[button]

O llámame o escríbeme al {{phone}}.

Hablamos pronto,
{{agent}}, Car Tag & Registration Services · We speak English too.`,
        },
        button: { en: "Finish my quote →", es: "Terminar mi cotización →" },
      }),
      step("e2", 1, "all", {
        subject: { en: "Don't spend your whole day on car insurance quotes", es: "No pierdas el día entero cotizando seguros" },
        preview: { en: "One carrier can take up to an hour. We compare all of them in less.", es: "Una aseguradora puede tomar una hora. Nosotros comparamos todas en menos." },
        body: {
          en: `Hi {{name}},

Quick math. Getting a quote from one insurance company usually takes 35 minutes to an hour: the forms, the hold music, the "let me transfer you."

Now do that with 5 companies. Then try to compare the offers, when each one covers different things.

That's your whole day gone. And most people give up and just renew what they have, even when they're overpaying.

Here's what we do instead:
• You answer our questions once.
• We check every carrier available to you.
• In less than an hour, you see the lowest rates side by side, explained in plain English (or Spanish).

You keep your day. We do the running around.

[button]

{{agent}}, Car Tag & Registration Services · {{phone}}

P.S. Already have insurance? Great. Most of our drivers had a policy when they came to us. They just wanted to know whether they were paying too much.`,
          es: `Hola {{name}},

Hagamos cuentas. Cotizar con una sola aseguradora suele tomar de 35 minutos a una hora: los formularios, la música de espera, el "déjeme transferirlo".

Ahora hazlo con 5 compañías. Y después intenta comparar las ofertas, cuando cada una cubre cosas distintas.

Se te fue el día. Y la mayoría se rinde y renueva lo que ya tiene, aunque esté pagando de más.

Esto es lo que hacemos nosotros:
• Respondes nuestras preguntas una sola vez.
• Revisamos todas las aseguradoras disponibles para ti.
• En menos de una hora ves las tarifas más bajas lado a lado, explicadas en palabras sencillas, en español o inglés.

Tú conservas tu día. Nosotros hacemos las vueltas.

[button]

{{agent}}, Car Tag & Registration Services · {{phone}}

P.D. ¿Ya tienes seguro? Perfecto. La mayoría de nuestros clientes tenía una póliza cuando llegó. Solo querían saber si estaban pagando de más.`,
        },
        button: { en: "Compare my rates now →", es: "Comparar mis tarifas →" },
      }),
      step("e3", 3, "all", {
        subject: { en: '"He stayed with me until I had my cards"', es: '"Se quedó conmigo hasta que tuve mis tarjetas"' },
        preview: { en: "What happened when one driver let us do the shopping", es: "Lo que pasó cuando un conductor nos dejó cotizar por él" },
        body: {
          en: `Hi {{name}},

I want to share something one of our customers wrote about David, one of our agents:

"Outstanding job, David, he patiently walked me through the whole process, saved me more than 200 dollars in my new policy and stayed with me until I had access to my policy and the cards and ids." — [Customer first name + last initial, with their permission]

That last part matters. A lot of places send you a price and disappear. We stay with you until your policy is active and your insurance cards are in your hands.

And that's not a one-time thing:
• 6+ years helping drivers
• 10,000+ drivers helped so far
• Service in English and Spanish, from people who know your area

You could be next. It takes less than an hour.

[button]

{{agent}}, Car Tag & Registration Services · {{phone}}

P.S. Rather talk it through? Just reply to this email with the best time to call you.`,
          es: `Hola {{name}},

Quiero compartirte lo que escribió uno de nuestros clientes sobre David, uno de nuestros agentes:

"Excelente trabajo, David. Me guió con paciencia en todo el proceso, me ahorró más de 200 dólares en mi nueva póliza y se quedó conmigo hasta que tuve acceso a mi póliza y a las tarjetas e identificaciones." — [Nombre del cliente + inicial del apellido, con su permiso]

Eso último importa. Muchos te mandan un precio y desaparecen. Nosotros nos quedamos contigo hasta que tu póliza esté activa y tengas tus tarjetas de seguro en la mano.

Y no es algo de una sola vez:
• Más de 6 años ayudando a conductores
• Más de 10,000 conductores atendidos
• Atención en español e inglés, de gente que conoce tu zona

Tú podrías ser el próximo. Toma menos de una hora.

[button]

{{agent}}, Car Tag & Registration Services · {{phone}}

P.D. ¿Prefieres hablarlo? Responde este correo con la mejor hora para llamarte.`,
        },
        button: { en: "Get my comparison →", es: "Quiero mi comparación →" },
      }),
      step("e5-uninsured", 1, "uninsured", {
        subject: { en: "{{name|Quick question}}, is {{vehicle}} covered right now?", es: "{{name|Una pregunta}}, ¿{{vehicle}} está asegurado ahora?" },
        preview: { en: "Driving without insurance can cost a lot more than a policy", es: "Manejar sin seguro puede salir mucho más caro que una póliza" },
        body: {
          en: `Hi {{name}},

When you filled out our form, you told us where you stand with your insurance. If your coverage has lapsed, or is about to, I don't want you to wait on this.

In New York, New Jersey, Florida, and DC, driving without insurance can mean fines, trouble with your registration and plates, and paying out of pocket if something happens on the road. One fender bender can cost more than a full year of coverage.

The good news: this is exactly what we do every day.
• Insurance, tags, and registration in one place. No bouncing between offices.
• Real people from your community, in English or Spanish.
• Fast: your quotes compared in less than an hour.

Let's get you covered this week.

[button]

Or call or text {{phone}}. If I don't pick up, I'll call you right back.

{{agent}}, Car Tag & Registration Services`,
          es: `Hola {{name}},

Cuando llenaste nuestro formulario, nos contaste cómo está tu seguro. Si tu cobertura se venció, o está por vencerse, no quiero que esperes con esto.

En Nueva York, Nueva Jersey, Florida y DC, manejar sin seguro puede traer multas, problemas con tu registro y tus placas, y pagar de tu bolsillo si pasa algo en la calle. Un choque pequeño puede costar más que un año completo de cobertura.

La buena noticia: esto es exactamente lo que hacemos todos los días.
• Seguro, placas y registro en un solo lugar. Sin andar de oficina en oficina.
• Gente real de tu comunidad, en español o inglés.
• Rápido: tus cotizaciones comparadas en menos de una hora.

Vamos a asegurarte esta semana.

[button]

O llámame o escríbeme al {{phone}}. Si no contesto, te devuelvo la llamada enseguida.

{{agent}}, Car Tag & Registration Services`,
        },
        button: { en: "Talk to an agent today →", es: "Hablar con un agente hoy →" },
      }),
      step("e5-insured", 7, "insured", {
        subject: { en: "{{name|Quick question}}, are you overpaying for {{vehicle}}?", es: "{{name|Una pregunta}}, ¿estás pagando de más por {{vehicle}}?" },
        preview: { en: "Renewals often go up quietly. Let's check yours.", es: "Las renovaciones suelen subir sin avisar. Revisemos la tuya." },
        body: {
          en: `Hi {{name}},

Your policy renews every 6 or 12 months, and renewals often go up quietly. Before your next renewal, let's make sure you're not overpaying. It takes less than an hour.

The good news: this is exactly what we do every day.
• Insurance, tags, and registration in one place. No bouncing between offices.
• Real people from your community, in English or Spanish.
• Fast: your quotes compared in less than an hour.

Let's check your rate this week.

[button]

Or call or text {{phone}}. If I don't pick up, I'll call you right back.

{{agent}}, Car Tag & Registration Services`,
          es: `Hola {{name}},

Tu póliza se renueva cada 6 o 12 meses, y las renovaciones suelen subir sin avisar. Antes de tu próxima renovación, asegurémonos de que no estés pagando de más. Toma menos de una hora.

La buena noticia: esto es exactamente lo que hacemos todos los días.
• Seguro, placas y registro en un solo lugar. Sin andar de oficina en oficina.
• Gente real de tu comunidad, en español o inglés.
• Rápido: tus cotizaciones comparadas en menos de una hora.

Revisemos tu tarifa esta semana.

[button]

O llámame o escríbeme al {{phone}}. Si no contesto, te devuelvo la llamada enseguida.

{{agent}}, Car Tag & Registration Services`,
        },
        button: { en: "Talk to an agent today →", es: "Hablar con un agente hoy →" },
      }),
      step("e6", 10, "all", {
        subject: { en: "Should I close your file?", es: "¿Cierro tu solicitud?" },
        preview: { en: "No hard feelings either way", es: "Sin problema, decidas lo que decidas" },
        body: {
          en: `Hi {{name}},

I haven't heard back, so I'm guessing the timing isn't right, or you already found something. Totally fine.

Before I close your quote request, can you just reply with a number?

1 — Yes, I still want my quotes. Call me.
2 — Not now, check back in a few months.
3 — I'm all set, close my file.

Whatever you choose, thank you for thinking of us.

{{agent}}, Car Tag & Registration Services · {{phone}}`,
          es: `Hola {{name}},

No he sabido de ti, así que supongo que no es el momento, o ya encontraste algo. No hay problema.

Antes de cerrar tu solicitud de cotización, ¿me respondes solo con un número?

1 — Sí, todavía quiero mis cotizaciones. Llámame.
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
