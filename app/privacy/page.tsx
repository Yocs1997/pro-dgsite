import type { Metadata } from "next";

// Privacy policy for the insurance quote service (also the URL given to Meta for
// lead ads and the developer app). Contact details come from the same environment
// variables the emails use.

export const metadata: Metadata = {
  title: "Privacy Policy | Car Tag & Registration Services",
  description: "How Car Tag & Registration Services, a Pro-DG company, collects, uses and protects your information.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = { en: "September 29, 2026", es: "29 de septiembre de 2026" };
const BUSINESS = "Car Tag & Registration Services";
const PHONE = "(240) 256-6360";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
      <div className="flex flex-col gap-2 text-sky-text/85 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

const ul = "list-disc pl-5 flex flex-col gap-1";

export default function PrivacyPage() {
  const email = (process.env.MAIL_REPLY_TO ?? "").trim();
  const address = (process.env.MAIL_POSTAL_ADDRESS ?? "").trim();
  const contactEn = (
    <ul className={ul}>
      <li>Phone: {PHONE}</li>
      {email && (
        <li>
          Email: <a className="underline" href={`mailto:${email}`}>{email}</a>
        </li>
      )}
      {address && <li>Mail: {address}</li>}
    </ul>
  );
  const contactEs = (
    <ul className={ul}>
      <li>Teléfono: {PHONE}</li>
      {email && (
        <li>
          Correo: <a className="underline" href={`mailto:${email}`}>{email}</a>
        </li>
      )}
      {address && <li>Correo postal: {address}</li>}
    </ul>
  );

  return (
    <main className="min-h-screen text-white px-4 sm:px-6 py-12" style={{ backgroundColor: "#0B2B5E" }}>
      <div className="max-w-3xl mx-auto">
        <a href="/seguros" className="text-sm text-[#7cc4ff] hover:underline">
          ← Car insurance quotes / Cotiza tu seguro
        </a>
        <p className="mt-6 text-sm">
          <a href="#es" className="text-[#7cc4ff] hover:underline">
            Leer en español ↓
          </a>
        </p>

        {/* ─── English ─────────────────────────────────────────────── */}
        <article lang="en" className="mt-4">
          <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">Privacy Policy</h1>
          <p className="text-sm text-sky-text/65 mb-8">
            {BUSINESS}, a Pro-DG company · Last updated {UPDATED.en}
          </p>

          <Section title="Who we are">
            <p>
              {BUSINESS} (“we”, “us”), a Pro-DG company, helps drivers compare and buy car insurance. This policy explains what information we collect when you
              request a quote on our website (www.pro-dg.com) or through our ads on Facebook and Instagram, how we use it, and your choices.
            </p>
          </Section>

          <Section title="Information we collect">
            <ul className={ul}>
              <li>Contact details: name, email, phone number, address, city, state and ZIP code.</li>
              <li>
                Driver and vehicle details you give us to prepare a quote: date of birth, license type and number, driving history (accidents, tickets, SR-22),
                vehicles, current insurance and the coverage you want. A photo of your driver&apos;s license, only if you choose to upload one.
              </li>
              <li>Messages you send us and notes from our calls with you.</li>
              <li>
                Technical information collected automatically, such as pages visited and whether our emails were delivered, opened or clicked, through cookies,
                tracking pixels (including the Meta Pixel) and similar tools.
              </li>
            </ul>
          </Section>

          <Section title="How we use it">
            <ul className={ul}>
              <li>To prepare and compare insurance quotes and help you buy a policy if you choose to.</li>
              <li>To contact you about your request by email, phone or text message, according to the consent you gave.</li>
              <li>To send follow-up emails about your quote. Every email has an unsubscribe link.</li>
              <li>To measure and improve our website and ads.</li>
              <li>To comply with the law and protect against fraud.</li>
            </ul>
          </Section>

          <Section title="Who we share it with">
            <ul className={ul}>
              <li>Insurance carriers and licensed agents, only as needed to get your quotes and issue a policy you choose.</li>
              <li>
                Service providers that run our business for us, such as website hosting, databases, email delivery and internal notification tools. They may
                only use your information to provide those services.
              </li>
              <li>Meta (Facebook and Instagram), when you submit one of our lead forms or visit pages with the Meta Pixel, to measure our ads.</li>
              <li>Authorities, when the law requires it.</li>
            </ul>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="How long we keep it">
            <p>
              We keep your information for as long as we need it to handle your request, serve you as a customer and meet legal requirements, and then delete it.
            </p>
          </Section>

          <Section title="Your choices">
            <ul className={ul}>
              <li>Unsubscribe from our emails at any time with the link at the bottom of any email.</li>
              <li>Ask us to access, correct or delete your information using the contact details below.</li>
              <li>Depending on where you live, you may have additional privacy rights under state law; contact us to use them.</li>
            </ul>
          </Section>

          <Section title="Deleting your data (including data from Facebook or Instagram forms)">
            <p>
              To delete the information you gave us, including answers submitted through our Facebook or Instagram lead forms, contact us by phone or email with
              your name and the email or phone you used. We will confirm and delete it within 30 days, except where the law requires us to keep it.
            </p>
          </Section>

          <Section title="Security">
            <p>We use reasonable safeguards to protect your information. No system is completely secure, so please avoid sending sensitive data by email.</p>
          </Section>

          <Section title="Children">
            <p>Our services are for adults. We do not knowingly collect information from children under 13.</p>
          </Section>

          <Section title="Changes">
            <p>If we change this policy, we will post the new version here with a new “last updated” date.</p>
          </Section>

          <Section title="Contact us">{contactEn}</Section>
        </article>

        <hr className="my-12 border-white/10" />

        {/* ─── Español ─────────────────────────────────────────────── */}
        <article lang="es" id="es">
          <h2 className="font-display font-black text-3xl sm:text-4xl mb-2">Política de privacidad</h2>
          <p className="text-sm text-sky-text/65 mb-8">
            {BUSINESS}, una empresa de Pro-DG · Última actualización: {UPDATED.es}
          </p>

          <Section title="Quiénes somos">
            <p>
              {BUSINESS} (“nosotros”), una empresa de Pro-DG, ayuda a conductores a comparar y comprar seguros de auto. Esta política explica qué información
              recopilamos cuando pides una cotización en nuestro sitio web (www.pro-dg.com) o en nuestros anuncios de Facebook e Instagram, cómo la usamos y qué
              opciones tienes.
            </p>
          </Section>

          <Section title="Información que recopilamos">
            <ul className={ul}>
              <li>Datos de contacto: nombre, correo, teléfono, dirección, ciudad, estado y código postal.</li>
              <li>
                Datos del conductor y del vehículo que nos das para cotizar: fecha de nacimiento, tipo y número de licencia, historial de manejo (accidentes,
                multas, SR-22), vehículos, seguro actual y la cobertura que quieres. Una foto de tu licencia, solo si decides subirla.
              </li>
              <li>Mensajes que nos envías y notas de nuestras llamadas contigo.</li>
              <li>
                Información técnica recopilada automáticamente, como páginas visitadas y si nuestros correos fueron entregados, abiertos o tuvieron clics, mediante
                cookies, píxeles de seguimiento (incluido el Píxel de Meta) y herramientas similares.
              </li>
            </ul>
          </Section>

          <Section title="Cómo la usamos">
            <ul className={ul}>
              <li>Para preparar y comparar cotizaciones de seguro y ayudarte a comprar una póliza si así lo decides.</li>
              <li>Para contactarte sobre tu solicitud por correo, teléfono o mensaje de texto, según el consentimiento que diste.</li>
              <li>Para enviarte correos de seguimiento sobre tu cotización. Cada correo incluye un enlace para darte de baja.</li>
              <li>Para medir y mejorar nuestro sitio web y nuestros anuncios.</li>
              <li>Para cumplir la ley y prevenir fraudes.</li>
            </ul>
          </Section>

          <Section title="Con quién la compartimos">
            <ul className={ul}>
              <li>Aseguradoras y agentes con licencia, solo lo necesario para obtener tus cotizaciones y emitir la póliza que elijas.</li>
              <li>
                Proveedores que operan servicios para nosotros, como alojamiento web, bases de datos, envío de correos y herramientas internas de notificación.
                Solo pueden usar tu información para prestar esos servicios.
              </li>
              <li>Meta (Facebook e Instagram), cuando envías uno de nuestros formularios o visitas páginas con el Píxel de Meta, para medir nuestros anuncios.</li>
              <li>Autoridades, cuando la ley lo exija.</li>
            </ul>
            <p>No vendemos tu información personal.</p>
          </Section>

          <Section title="Cuánto tiempo la guardamos">
            <p>
              Guardamos tu información mientras la necesitemos para atender tu solicitud, darte servicio como cliente y cumplir requisitos legales; después la
              eliminamos.
            </p>
          </Section>

          <Section title="Tus opciones">
            <ul className={ul}>
              <li>Darte de baja de nuestros correos en cualquier momento con el enlace al final de cualquier correo.</li>
              <li>Pedirnos acceder, corregir o eliminar tu información con los datos de contacto de abajo.</li>
              <li>Según dónde vivas, puedes tener derechos de privacidad adicionales bajo la ley de tu estado; contáctanos para ejercerlos.</li>
            </ul>
          </Section>

          <Section title="Eliminar tus datos (incluidos los de formularios de Facebook o Instagram)">
            <p>
              Para eliminar la información que nos diste, incluidas las respuestas enviadas en nuestros formularios de Facebook o Instagram, contáctanos por
              teléfono o correo con tu nombre y el correo o teléfono que usaste. Confirmaremos y la eliminaremos en un máximo de 30 días, salvo que la ley nos
              obligue a conservarla.
            </p>
          </Section>

          <Section title="Seguridad">
            <p>Usamos medidas razonables para proteger tu información. Ningún sistema es totalmente seguro, así que evita enviar datos sensibles por correo.</p>
          </Section>

          <Section title="Menores">
            <p>Nuestros servicios son para adultos. No recopilamos a sabiendas información de menores de 13 años.</p>
          </Section>

          <Section title="Cambios">
            <p>Si cambiamos esta política, publicaremos la nueva versión aquí con una nueva fecha de actualización.</p>
          </Section>

          <Section title="Contáctanos">{contactEs}</Section>
        </article>
      </div>
    </main>
  );
}
