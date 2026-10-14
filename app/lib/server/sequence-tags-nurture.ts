import "server-only";
import type { Sequence, Step } from "./sequences";

// "Tags & Registration Lead Nurture": 8 emails over 14 days for people who asked about tags
// or registration (NJ, PA, VA, MD, NY, SD). English copy as written by the office (Oct 2026);
// Spanish is a translation in the same plain voice.
// Not built yet in the portal: tags, click-based branches and local-time send windows.
// Until there is a booking link the buttons call the office; WhatsApp lines are left out
// until a WhatsApp number is confirmed. Email 6 stays inactive until there is a real
// client story, and Email 5 keeps [LICENSED AGENCY NAME] / [STATES] so the sequence can't
// be turned on before the licensed-agency line is filled in.

const step = (id: string, day: number, s: Omit<Step, "id" | "day" | "audience">): Step => ({ id, day, audience: "all", ...s });
const QUOTE = { en: "https://www.pro-dg.com/seguros", es: "https://www.pro-dg.com/es/seguros" };
const CALL = { en: "Call for your free case review →", es: "Llamar para mi revisión gratis →" };
const SIGN = { en: "{{agent}}\nCar Tag & Registration Services · {{phone}}", es: "{{agent}}\nCar Tag & Registration Services · {{phone}}" };

export function defaultTagsNurtureSequence(now = Date.now()): Sequence {
  return {
    id: `seq-${now.toString(36)}`,
    name: "Placas y registro: 8 correos",
    active: false,
    autoEnrollForm: false,
    formFor: "tags",
    company: "Car Tag & Registration Services",
    agentName: "",
    phone: "(240) 256-6360",
    buttonUrl: "tel:+12402566360",
    footerNote: {
      en: "You're receiving this email because you asked Car Tag & Registration Services about tags or registration. Car Tag & Registration Services is a private registration service and is not affiliated with any state DMV or MVA.",
      es: "Recibes este correo porque le preguntaste a Car Tag & Registration Services sobre placas o registro. Car Tag & Registration Services es un servicio privado de registro y no está afiliado a ningún DMV ni MVA estatal.",
    },
    createdAt: now,
    updatedAt: now,
    steps: [
      step("n1", 0, {
        subject: { en: "{{name|Hi}}, we got your tag request", es: "{{name|Hola}}, recibimos tu solicitud de placas" },
        preview: { en: "Here's what happens next (it's quick)", es: "Esto es lo que sigue (es rápido)" },
        body: {
          en: `Hi {{name}},

Thanks for reaching out to Car Tag & Registration Services. Your request is in, and a real person is looking at it.

If you're here, the DMV probably hasn't made this easy. Maybe it's an inspection, a hold on your record, missing paperwork, or you just don't have a day to waste in line. We hear it every day, and most of it is fixable.

Here's what happens next:
1. Free 5-minute case review. You tell us your situation, we tell you your options.
2. We pick the right legal path, in your home state or another state where you qualify.
3. We handle the paperwork and file with the DMV for you.

The fastest way to get started:

[button]

Prefer to talk now? Call or text {{phone}}. Hablamos español.

Talk soon,
{{agent}}
Car Tag & Registration Services

P.S. Already driving on expired tags? Tell us when you call. We'll prioritize your file.`,
          es: `Hola {{name}},

Gracias por escribirle a Car Tag & Registration Services. Tu solicitud ya llegó y una persona de verdad la está revisando.

Si estás aquí, seguro el DMV no te la ha puesto fácil. Puede ser una inspección, un bloqueo en tu récord, papeles que faltan, o simplemente no tienes un día entero para perder en una fila. Lo escuchamos todos los días, y casi siempre tiene solución.

Esto es lo que sigue:
1. Revisión gratis de 5 minutos. Nos cuentas tu situación y te decimos tus opciones.
2. Escogemos el camino legal correcto, en tu estado o en otro estado donde califiques.
3. Nosotros hacemos el papeleo y lo presentamos al DMV por ti.

La forma más rápida de empezar:

[button]

¿Prefieres hablar ahora? Llama o escribe al {{phone}}. We speak English too.

Hablamos pronto,
{{agent}}
Car Tag & Registration Services

P.D. ¿Ya estás manejando con las placas vencidas? Dínoslo cuando llames y le damos prioridad a tu caso.`,
        },
        button: CALL,
      }),
      step("n2", 1, {
        subject: { en: "Tags without the DMV headache (3 steps)", es: "Placas sin el dolor de cabeza del DMV (3 pasos)" },
        preview: { en: "You don't have to figure this out alone", es: "No tienes que resolverlo tú solo" },
        body: {
          en: `Hi {{name}},

Most people who call us have already tried to do it themselves. Two trips to the DMV, a form they filled out wrong, a letter they didn't understand.

Here's how we do it instead:

Step 1. Tell us your situation. Five minutes on the phone. No judgment, we've heard it all.

Step 2. We find your path. We register vehicles in NJ, PA, VA, MD, NY and SD. Depending on where you live and what's holding you up, we'll tell you which option actually fits your case, and which ones don't.

Step 3. We do the work. Forms, title, filing, follow-up with the DMV. You get your plates and registration without the lines.

That's it. No guessing, no running in circles.

[button]

${SIGN.en}`,
          es: `Hola {{name}},

La mayoría de la gente que nos llama ya intentó hacerlo por su cuenta. Dos viajes al DMV, un formulario mal llenado, una carta que no entendieron.

Así lo hacemos nosotros:

Paso 1. Cuéntanos tu situación. Cinco minutos por teléfono. Sin juzgarte, ya lo hemos oído todo.

Paso 2. Encontramos tu camino. Registramos vehículos en NJ, PA, VA, MD, NY y SD. Según dónde vives y qué te está deteniendo, te decimos qué opción de verdad sirve para tu caso, y cuáles no.

Paso 3. Nosotros hacemos el trabajo. Formularios, título, trámite y seguimiento con el DMV. Tú recibes tus placas y tu registro sin hacer filas.

Así de simple. Sin adivinar, sin dar vueltas.

[button]

${SIGN.es}`,
        },
        button: { en: "Call for your free review →", es: "Llamar para mi revisión gratis →" },
      }),
      step("n3", 2, {
        subject: { en: '"Is this even legit?"', es: '"¿Esto de verdad es legal?"' },
        preview: { en: "Fair question. Here's the straight answer.", es: "Buena pregunta. Aquí va la respuesta directa." },
        body: {
          en: `Hi {{name}},

If you've wondered whether a tag service like ours is legit, good. You should ask.

There are people out there selling "tags" that aren't real, or that put you at risk the first time you get pulled over. That's not us.

Here's how we work:
• Everything is filed directly with the state DMV. Your registration shows up in the state system like anyone else's.
• We tell you the truth about your options. If an out-of-state registration doesn't fit your situation, we'll say so and help you fix it in your home state instead.
• No surprise fees. You'll know the full cost before we start.

The easiest way to see if we can help is to tell us what's going on. Just hit reply and write one or two lines about your situation, like "failed inspection in NJ" or "MVA hold in Maryland."

I'll read it and get back to you personally.

${SIGN.en}`,
          es: `Hola {{name}},

Si te has preguntado si un servicio de placas como el nuestro es legítimo, qué bueno. Debes preguntarlo.

Hay gente que vende "placas" que no son reales, o que te ponen en riesgo la primera vez que te para la policía. Nosotros no somos eso.

Así trabajamos:
• Todo se presenta directamente ante el DMV del estado. Tu registro aparece en el sistema del estado como el de cualquier otra persona.
• Te decimos la verdad sobre tus opciones. Si un registro de otro estado no sirve para tu situación, te lo decimos y te ayudamos a resolverlo en tu propio estado.
• Sin cargos sorpresa. Sabrás el costo completo antes de empezar.

La forma más fácil de saber si te podemos ayudar es que nos cuentes qué está pasando. Solo responde este correo y escribe una o dos líneas sobre tu situación, como "no pasé la inspección en NJ" o "tengo un bloqueo en la MVA de Maryland".

Yo lo leo y te contesto personalmente.

${SIGN.es}`,
        },
        button: { en: "", es: "" },
      }),
      step("n4", 4, {
        subject: { en: "Stuck at the DMV in {{state}}?", es: "¿Atorado con el DMV en {{state}}?" },
        preview: { en: "Inspection, holds, paperwork. Here's what we can fix.", es: "Inspección, bloqueos, papeles. Esto es lo que podemos resolver." },
        body: {
          en: `Hi {{name}},

Not everyone needs out-of-state tags. A lot of our clients just need someone to untangle their home-state DMV.

We help with things like:
• Failed or overdue inspections. We walk you through what's needed and get your registration moving once you pass.
• Holds and blocks on your record. We find out exactly what's causing it and the fastest way to clear it.
• Title problems. Lost title, out-of-state title, title not in your name, lien that's paid off but still showing.
• Missing documents. We tell you exactly what the DMV will accept so you only go once, or not at all.

One call usually tells us which of these you're dealing with.

[button]

${SIGN.en}`,
          es: `Hola {{name}},

No todos necesitan placas de otro estado. Muchos de nuestros clientes solo necesitan a alguien que les resuelva el enredo con el DMV de su propio estado.

Te ayudamos con cosas como:
• Inspecciones reprobadas o vencidas. Te explicamos qué se necesita y movemos tu registro en cuanto pases.
• Bloqueos en tu récord. Averiguamos exactamente qué lo causa y la forma más rápida de quitarlo.
• Problemas con el título. Título perdido, título de otro estado, título que no está a tu nombre, o un préstamo ya pagado que todavía aparece.
• Documentos que faltan. Te decimos exactamente qué acepta el DMV para que vayas una sola vez, o ninguna.

Con una llamada normalmente sabemos cuál de estos es tu caso.

[button]

${SIGN.es}`,
        },
        button: CALL,
      }),
      step("n5", 6, {
        subject: { en: "No insurance, no tags", es: "Sin seguro, no hay placas" },
        preview: { en: "We can fix both at once", es: "Podemos resolver las dos cosas a la vez" },
        body: {
          en: `Hi {{name}},

Quick heads-up most people don't hear until they're at the counter: every state we work with requires proof of active insurance before it will register your car.

If your insurance lapsed, or you're paying too much, we can help with that too. We compare rates from multiple carriers in your state, so you don't have to call around.

• Coverage that meets your state's minimums, or more if you want it
• Options for drivers who've been turned down or had a lapse
• Your proof of insurance goes straight into your registration file, so there's one less thing to chase

[button]

It takes about 3 minutes, and there's no obligation.

${SIGN.en}

Insurance quotes provided by [LICENSED AGENCY NAME], licensed in [STATES].`,
          es: `Hola {{name}},

Un aviso rápido que la mayoría no escucha hasta que está en la ventanilla: todos los estados con los que trabajamos piden prueba de seguro activo antes de registrar tu carro.

Si tu seguro se venció, o estás pagando demasiado, también te ayudamos con eso. Comparamos precios de varias aseguradoras en tu estado, para que no tengas que llamar a una por una.

• Cobertura que cumple con el mínimo de tu estado, o más si la quieres
• Opciones para conductores a los que les negaron el seguro o que estuvieron sin seguro
• Tu prueba de seguro va directo a tu expediente de registro, así tienes una cosa menos que perseguir

[button]

Toma unos 3 minutos y no te compromete a nada.

${SIGN.es}

Cotizaciones de seguro ofrecidas por [LICENSED AGENCY NAME], con licencia en [STATES].`,
        },
        button: { en: "Compare insurance rates →", es: "Comparar precios de seguro →" },
        buttonUrl: QUOTE,
      }),
      step("n6", 8, {
        inactive: true, // needs a real client story with permission
        subject: { en: "How [CLIENT FIRST NAME] got back on the road", es: "Cómo [CLIENT FIRST NAME] volvió a manejar" },
        preview: { en: "Two DMV trips, zero progress. Then this.", es: "Dos viajes al DMV y nada. Hasta que pasó esto." },
        body: {
          en: `Hi {{name}},

Let me tell you about [CLIENT FIRST NAME].

[He/She] came to us after [the problem, in one line]. [He/She'd] been to the DMV [number] times and was about to [stakes, e.g. "lose the car he needs for work"].

We did a 5-minute review, found that [the real cause, in one line], and [what we did, in one line].

[Number] days later, [he/she] had [result, e.g. "plates and a valid registration in hand"].

In [his/her] words: "[short real quote, under 20 words]"

Your situation is probably different. But odds are we've seen something close to it.

[button]

${SIGN.en}`,
          es: `Hola {{name}},

Déjame contarte de [CLIENT FIRST NAME].

[Él/Ella] llegó con nosotros después de [el problema, en una línea]. Había ido al DMV [número] veces y estaba a punto de [lo que estaba en juego, p. ej. "perder el carro que necesita para trabajar"].

Hicimos una revisión de 5 minutos, encontramos que [la causa real, en una línea] y [lo que hicimos, en una línea].

[Número] días después, [él/ella] tenía [resultado, p. ej. "placas y un registro válido en la mano"].

En sus palabras: "[cita real corta, menos de 20 palabras]"

Tu situación probablemente es distinta. Pero lo más seguro es que ya hemos visto algo parecido.

[button]

${SIGN.es}`,
        },
        button: CALL,
      }),
      step("n7", 11, {
        subject: { en: "What expired tags really cost", es: "Lo que de verdad cuestan las placas vencidas" },
        preview: { en: "It's more than the ticket", es: "Es más que la multa" },
        body: {
          en: `Hi {{name}},

Driving on expired or missing registration feels like a small risk until it isn't. Here's what it can lead to, depending on your state:
• A ticket and fine at any traffic stop
• The car towed and impounded, plus daily storage fees
• Trouble with your insurance if there's an accident
• Late fees that keep stacking up the longer you wait

The longer a registration problem sits, the more it usually costs to fix.

If you're still dealing with this, let's sort it out this week. The fastest way:

📞 Call or text {{phone}}

Tell us your name and state, and we'll take it from there.

{{agent}}
Car Tag & Registration Services`,
          es: `Hola {{name}},

Manejar con el registro vencido o sin registro parece un riesgo pequeño, hasta que deja de serlo. Según tu estado, esto es lo que te puede pasar:
• Una multa en cualquier parada de tránsito
• Que se lleven el carro con la grúa al corralón, más el cobro diario de almacenaje
• Problemas con tu seguro si tienes un accidente
• Recargos que se siguen acumulando mientras más esperas

Mientras más tiempo pasa un problema de registro, normalmente más cuesta arreglarlo.

Si todavía estás con esto, resolvámoslo esta semana. La forma más rápida:

📞 Llama o escribe al {{phone}}

Dinos tu nombre y tu estado, y nosotros nos encargamos.

{{agent}}
Car Tag & Registration Services`,
        },
        button: { en: "", es: "" },
      }),
      step("n8", 14, {
        subject: { en: "Should I close your file?", es: "¿Cierro tu solicitud?" },
        preview: { en: "Just reply 1 or 2", es: "Solo responde 1 o 2" },
        body: {
          en: `Hi {{name}},

I haven't heard back, so I don't want to keep filling your inbox.

Can you do me a favor and reply with just a number?

1 = I still need help with my tags
2 = I'm all set, you can close my file

If it's a 1, I'll call you personally and we'll get moving. If it's a 2, no problem at all, and congrats on getting it sorted.

Either way, thanks for considering Car Tag & Registration Services.

${SIGN.en}`,
          es: `Hola {{name}},

No he sabido de ti, así que no quiero seguir llenando tu correo.

¿Me haces un favor y me respondes solo con un número?

1 = Todavía necesito ayuda con mis placas
2 = Ya lo resolví, puedes cerrar mi solicitud

Si es 1, te llamo personalmente y nos ponemos en marcha. Si es 2, no hay problema, y felicidades por resolverlo.

De cualquier forma, gracias por tomarnos en cuenta.

${SIGN.es}`,
        },
        button: { en: "", es: "" },
      }),
    ],
  };
}
