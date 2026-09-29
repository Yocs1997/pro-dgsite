// Frequently asked questions for /seguros (shown on the page and sent to search
// engines as FAQPage structured data). Keep answers accurate and general: rules
// differ by state, so avoid promising anything a carrier decides.

export type Faq = { q: { en: string; es: string }; a: { en: string; es: string } };

export const FAQ: Faq[] = [
  {
    q: { en: "How does it work?", es: "¿Cómo funciona?" },
    a: {
      en: "You fill out one form (about 3 minutes) with your details, your vehicles and the coverage you want. We compare the carriers available for your state and driver profile and email you your options. An agent can walk you through them by phone, in English or Spanish, and help you finish the purchase if you decide to buy.",
      es: "Llenas un solo formulario (unos 3 minutos) con tus datos, tus vehículos y la cobertura que quieres. Comparamos las aseguradoras disponibles para tu estado y tu perfil de conductor y te enviamos tus opciones por correo. Un agente puede explicártelas por teléfono, en español o inglés, y ayudarte a completar la compra si decides comprar.",
    },
  },
  {
    q: { en: "Is the quote free? Do I have to buy?", es: "¿La cotización es gratis? ¿Estoy obligado a comprar?" },
    a: {
      en: "Yes, the quote is free and you are never obligated to buy. If you choose to purchase a policy through us, a US$150 service fee applies, and we tell you before you pay anything.",
      es: "Sí, la cotización es gratis y nunca estás obligado a comprar. Si decides comprar una póliza con nosotros, se aplica un cargo de servicio de US$150, y te lo decimos antes de que pagues nada.",
    },
  },
  {
    q: { en: "How long does it take to get my quote?", es: "¿Cuánto tarda mi cotización?" },
    a: {
      en: "The form takes about 3 minutes. We usually send your comparison the same business day, often in less than an hour. Calling (240) 256-6360 is the fastest way to finish.",
      es: "El formulario toma unos 3 minutos. Normalmente enviamos tu comparación el mismo día hábil, muchas veces en menos de una hora. Llamar al (240) 256-6360 es la forma más rápida de terminar.",
    },
  },
  {
    q: { en: "What information do I need?", es: "¿Qué información necesito?" },
    a: {
      en: "Your driver's license details, date of birth, the address where the car is kept, each vehicle's year, make and model (the VIN helps), the drivers in your household, and your current insurance if you have any. You can also upload a photo of your license instead of typing it.",
      es: "Los datos de tu licencia de conducir, tu fecha de nacimiento, la dirección donde se guarda el auto, el año, la marca y el modelo de cada vehículo (el VIN ayuda), los conductores de tu hogar y tu seguro actual si tienes. También puedes subir una foto de tu licencia en lugar de escribir los datos.",
    },
  },
  {
    q: { en: "Do you work in my state?", es: "¿Trabajan en mi estado?" },
    a: {
      en: "We help drivers in all 50 states. Which carriers and prices are available depends on your state, your vehicle and your driving history.",
      es: "Ayudamos a conductores en los 50 estados. Las aseguradoras y los precios disponibles dependen de tu estado, tu vehículo y tu historial de manejo.",
    },
  },
  {
    q: { en: "Can I get insured with a foreign or international license?", es: "¿Puedo asegurarme con una licencia extranjera o internacional?" },
    a: {
      en: "Often, yes. Some carriers insure drivers with a foreign or international license, although options and prices vary by state and carrier, and some ask you to get a US license within a set time. Choose \"International / foreign license\" in the form and we will look for carriers that accept it.",
      es: "Muchas veces sí. Algunas aseguradoras aseguran a conductores con licencia extranjera o internacional, aunque las opciones y los precios varían por estado y aseguradora, y algunas piden sacar una licencia de EE. UU. en cierto plazo. Elige \"Licencia internacional / extranjera\" en el formulario y buscaremos aseguradoras que la acepten.",
    },
  },
  {
    q: { en: "What is the difference between liability and full coverage?", es: "¿Cuál es la diferencia entre responsabilidad civil y cobertura completa?" },
    a: {
      en: "Liability pays for injuries and damage you cause to other people; it is the part the law requires. \"Full coverage\" is not an official term: it usually means liability plus collision (damage to your car in a crash) and comprehensive (theft, fire, flood, vandalism, hitting an animal). If your car is financed or leased, the lender almost always requires full coverage.",
      es: "La responsabilidad civil paga las lesiones y los daños que le causas a otras personas; es la parte que exige la ley. \"Cobertura completa\" no es un término oficial: normalmente significa responsabilidad civil más choque (daños a tu auto en un accidente) e integral (robo, incendio, inundación, vandalismo, golpear a un animal). Si tu auto está financiado o arrendado, el prestamista casi siempre exige cobertura completa.",
    },
  },
  {
    q: { en: "How much insurance does the law require?", es: "¿Cuánto seguro exige la ley?" },
    a: {
      en: "Almost every state requires at least liability insurance, and each state sets its own minimum limits. Some states require more: New York, New Jersey and Florida, for example, also require personal injury protection (PIP), and several states require uninsured motorist coverage. We quote at least your state's minimum, and we can show you higher limits so you can compare.",
      es: "Casi todos los estados exigen al menos seguro de responsabilidad civil, y cada estado fija sus propios límites mínimos. Algunos estados piden más: por ejemplo, Nueva York, Nueva Jersey y Florida también exigen protección contra lesiones personales (PIP), y varios estados exigen cobertura contra conductores sin seguro. Cotizamos al menos el mínimo de tu estado y podemos mostrarte límites más altos para que compares.",
    },
  },
  {
    q: { en: "What happens if I drive without insurance?", es: "¿Qué pasa si manejo sin seguro?" },
    a: {
      en: "Depending on the state, it can mean fines, a suspended license or registration, losing your plates, and paying out of pocket for any damage or injuries you cause. One small accident can cost more than a full year of coverage.",
      es: "Según el estado, puede significar multas, la suspensión de tu licencia o registro, perder tus placas y pagar de tu bolsillo cualquier daño o lesión que causes. Un accidente pequeño puede costar más que un año completo de cobertura.",
    },
  },
  {
    q: { en: "My insurance lapsed. Can I still get covered?", es: "Mi seguro se venció. ¿Todavía puedo asegurarme?" },
    a: {
      en: "Yes. A gap in coverage can raise your price, so it is best to get covered again as soon as possible. Tell us in the form that your insurance lapsed and we will look for the best option available to you.",
      es: "Sí. Un periodo sin seguro puede subir tu precio, así que lo mejor es volver a asegurarte lo antes posible. Indica en el formulario que tu seguro se venció y buscaremos la mejor opción disponible para ti.",
    },
  },
  {
    q: { en: "I have tickets, accidents or need an SR-22. Can you help?", es: "Tengo multas, accidentes o necesito un SR-22. ¿Pueden ayudarme?" },
    a: {
      en: "Yes, include them in the form so your quote is accurate. An SR-22 is not insurance itself: it is a certificate your carrier files with the state to prove you have coverage, usually required after serious violations. Not every carrier files SR-22s, so we look for ones that do in your state.",
      es: "Sí, inclúyelos en el formulario para que tu cotización sea exacta. El SR-22 no es un seguro: es un certificado que tu aseguradora presenta ante el estado para demostrar que tienes cobertura, normalmente exigido después de infracciones graves. No todas las aseguradoras presentan SR-22, así que buscamos las que sí lo hacen en tu estado.",
    },
  },
  {
    q: { en: "Does it matter which address I use?", es: "¿Importa qué dirección uso?" },
    a: {
      en: "Yes. Your policy must list the address where the car is actually kept overnight, because prices and rules depend on it. Giving a different address can get a policy cancelled or a claim denied, so always use your real one.",
      es: "Sí. Tu póliza debe indicar la dirección donde realmente se guarda el auto por la noche, porque los precios y las reglas dependen de ella. Dar otra dirección puede hacer que cancelen la póliza o nieguen un reclamo, así que usa siempre tu dirección real.",
    },
  },
  {
    q: { en: "Will getting a quote affect my credit score?", es: "¿Cotizar afecta mi puntaje de crédito?" },
    a: {
      en: "No. Carriers may check an insurance score when they quote, but that is a soft inquiry that does not lower your credit score.",
      es: "No. Las aseguradoras pueden revisar un puntaje de seguros al cotizar, pero es una consulta suave que no baja tu puntaje de crédito.",
    },
  },
  {
    q: { en: "Do you speak Spanish?", es: "¿Hablan español?" },
    a: {
      en: "Yes. Our team helps you in English or Spanish, by phone or email, from the quote until your policy and insurance cards are in your hands.",
      es: "Sí. Nuestro equipo te atiende en español o inglés, por teléfono o correo, desde la cotización hasta que tengas tu póliza y tus tarjetas de seguro.",
    },
  },
];
