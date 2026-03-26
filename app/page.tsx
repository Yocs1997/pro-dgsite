"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, BarChart, MonitorPlay, Users, Search, ChevronRight } from 'lucide-react';

// --- Simple Dictionary for English/Spanish ---
const content = {
  es: {
    nav: { services: "Servicios", portfolio: "Portafolio", team: "Equipo", contact: "Contacto" },
    hero: { title: "De la posición al", highlight: "éxito", subtitle: "Humanizamos tu presencia digital y optimizamos cada centavo de tu presupuesto.", cta: "Cotizar Ahora" },
    services: { title: "Nuestros Servicios", s1: "Gestión de Redes", s2: "Marketing Digital", s3: "Desarrollo Web", s4: "Media Buying" },
    portfolio: { title: "Nuestro Trabajo", subtitle: "Casos de éxito y contenido visual" },
    team: { title: "Conoce al Equipo" },
    clients: { title: "Nuestros Clientes" }
  },
  en: {
    nav: { services: "Services", portfolio: "Portfolio", team: "Team", contact: "Contact" },
    hero: { title: "From positioning to", highlight: "success", subtitle: "We humanize your digital presence and optimize every penny of your budget.", cta: "Get a Quote" },
    services: { title: "Our Services", s1: "Social Media", s2: "Digital Marketing", s3: "Web Development", s4: "Media Buying" },
    portfolio: { title: "Our Work", subtitle: "Success stories and visual content" },
    team: { title: "Meet the Team" },
    clients: { title: "Our Clients" }
  }
};

export default function Home() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const t = content[lang];

  return (
    <main className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-blue selection:text-white">
      
      {/* Navigation & Language Toggle */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-brand-dark/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Replace with your actual SVG logo */}
            <BarChart className="text-brand-blue w-8 h-8" />
            <span className="font-bold text-2xl tracking-tight">PRO-DG</span>
          </div>
          
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <a href="#services" className="hover:text-brand-blue transition">{t.nav.services}</a>
            <a href="#portfolio" className="hover:text-brand-blue transition">{t.nav.portfolio}</a>
            <a href="#team" className="hover:text-brand-blue transition">{t.nav.team}</a>
          </div>

          <button 
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition text-sm"
          >
            <Globe className="w-4 h-4" />
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-32 overflow-hidden flex flex-col items-center text-center">
        {/* Subtle background glow mimicking your ads */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/20 rounded-full blur-[120px] -z-10"></div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-extrabold mb-6 max-w-4xl leading-tight"
        >
          {t.hero.title} <span className="text-brand-blue">{t.hero.highlight}</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10"
        >
          {t.hero.subtitle}
        </motion.p>
        
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,150,255,0.4)]"
        >
          {t.hero.cta} <ChevronRight className="w-5 h-5" />
        </motion.button>
      </section>

      {/* Services Section */}
      <section id="services" className="px-6 py-24 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{t.services.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: t.services.s1 },
              { icon: Search, title: t.services.s2 },
              { icon: MonitorPlay, title: t.services.s3 },
              { icon: BarChart, title: t.services.s4 }
            ].map((service, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all cursor-default">
                <service.icon className="w-12 h-12 text-brand-blue mb-6" />
                <h3 className="text-xl font-semibold">{service.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio / Media Section */}
      <section id="portfolio" className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.portfolio.title}</h2>
            <p className="text-gray-400">{t.portfolio.subtitle}</p>
          </div>
          {/* Replace src with your actual project images/gifs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative group border border-white/10">
                <div className="absolute inset-0 bg-brand-dark/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="font-bold">Project {item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team & Clients Section (Side by side on desktop) */}
      <section id="team" className="px-6 py-24 bg-gradient-to-t from-black/40 to-transparent">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Team */}
          <div>
            <h2 className="text-3xl font-bold mb-8">{t.team.title}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
               {[1, 2, 3].map((member) => (
                <div key={member} className="min-w-[150px] text-center">
                  <div className="w-24 h-24 mx-auto bg-gray-700 rounded-full mb-4 border-2 border-brand-blue object-cover"></div>
                  <h4 className="font-semibold">Team Member</h4>
                  <p className="text-sm text-gray-400">Role</p>
                </div>
               ))}
            </div>
          </div>

          {/* Clients */}
          <div>
            <h2 className="text-3xl font-bold mb-8">{t.clients.title}</h2>
            <div className="flex flex-wrap gap-6 items-center">
              {/* Replace these divs with client logo images */}
              {[1, 2, 3, 4].map((client) => (
                <div key={client} className="w-24 h-12 bg-white/10 rounded-md flex items-center justify-center text-xs text-gray-500">Logo</div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Pro-DG Agency. All rights reserved.</p>
      </footer>
    </main>
  );
}