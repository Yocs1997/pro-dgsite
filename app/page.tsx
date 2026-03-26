"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Instagram,
  TrendingUp,
  Code2,
  Target,
  ArrowUpRight,
  Menu,
  X,
  ChevronRight,
  Zap,
  Globe,
  BarChart3,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import {
  teamMembers,
  portfolioItems,
  clientLogos,
  translations,
  type Language,
  type PortfolioItem,
} from "./lib/data";

// ─── Utility ─────────────────────────────────────────────────────────────────

const WHATSAPP_URL = "https://wa.me/50557449428";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function getCategoryColor(cat: string) {
  if (cat.includes("Web Dev")) return "#00d4aa";
  if (cat.includes("Media Buying")) return "#ff6b35";
  return "#0096FF"; // Social Media / Default
}

// ─── Fade-in wrapper ─────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section Tag ─────────────────────────────────────────────────────────────

function SectionTag({ label }: { label: string }) {
  const newLocal = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-electric-dim bg-[#0096ff0d] mb-4";
  return (
    <div className={newLocal}>
      <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
      <span className="text-xs font-mono tracking-widest text-electric uppercase">
        {label}
      </span>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ lang, setLang, t }: { lang: Language; setLang: (l: Language) => void; t: typeof translations["en"]["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#services", label: t.services },
    { href: "#portfolio", label: t.portfolio },
    { href: "#team", label: t.team },
    { href: "#clients", label: t.clients },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "glass border-b border-[#0096ff15]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Pro<span className="text-electric">-DG</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted hover:text-white transition-colors duration-200 font-medium tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#0096ff30] hover:border-[#0096ff70] bg-[#0096ff0d] hover:bg-electric-glow transition-all duration-200 text-xs font-mono font-bold text-electric tracking-widest"
          >
            <Globe className="w-3 h-3" />
            {lang === "en" ? "ES" : "EN"}
          </button>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-white text-sm font-semibold transition-all duration-200 glow-electric-sm hover:scale-105"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {t.cta}
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-1"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass border-t border-[#0096ff15] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sky-text hover:text-white py-2 border-b border-[#0096ff10] last:border-0"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setLang(lang === "en" ? "es" : "en")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#0096ff30] bg-[#0096ff0d] text-xs font-mono font-bold text-electric tracking-widest"
                >
                  <Globe className="w-3 h-3" />
                  {lang === "en" ? "ES" : "EN"}
                </button>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-electric text-white text-sm font-semibold"
                >
                  {t.cta}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ t }: { t: typeof translations["en"]["hero"] }) {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const newLocal = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 rounded-full";
  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden grid-lines"
    >
      {/* Deep background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          style={{
            y,
            background:
              "radial-gradient(circle, rgba(0,150,255,0.12) 0%, rgba(0,150,255,0.04) 40%, transparent 70%)",
          }}
          className={newLocal}
        />
        <div
          className="absolute top-20 right-20 w-64 h-64 rounded-full animate-pulse-slow"
          style={{
            background:
              "radial-gradient(circle, rgba(0,150,255,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-32 left-16 w-48 h-48 rounded-full animate-float"
          style={{
            background:
              "radial-gradient(circle, rgba(0,150,255,0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Scan line effect */}
      <div
        className="absolute left-0 right-0 h-px opacity-10 animate-scan pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, #0096FF, transparent)",
        }}
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0096ff40] bg-[#0096ff10] mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-electric" />
          <span className="text-xs font-mono tracking-widest text-electric uppercase">
            {t.badge}
          </span>
          <ChevronRight className="w-3 h-3 text-electric" />
        </motion.div>

        {/* Headline */}
        <div className="relative mb-6">
          {/* Blur glow behind headline */}
          <div
            className="absolute inset-0 blur-3xl opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 50%, #0096FF, transparent)",
            }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative font-display font-black leading-none tracking-tight"
          >
            <span className="block text-6xl md:text-8xl lg:text-9xl text-white">
              {t.headline1}
            </span>
            <span className="block text-6xl md:text-8xl lg:text-9xl text-white">
              {t.headline2}
            </span>
            <span
              className="block text-6xl md:text-8xl lg:text-9xl glow-text"
              style={{ color: "#0096FF" }}
            >
              {t.headline3}
            </span>
          </motion.h1>
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
        >
          {t.subheadline}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0,150,255,0.5), 0 0 80px rgba(0,150,255,0.2)" }}
            whileTap={{ scale: 0.97 }}
            className="relative group flex items-center gap-3 px-8 py-4 rounded-full bg-electric text-white font-bold text-lg overflow-hidden glow-electric transition-all duration-300"
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
              }}
            />
            <MessageCircle className="w-5 h-5" />
            {t.cta}
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.a>

          <p className="text-muted-dim text-sm font-mono">{t.ctaSub}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-10 border-t border-[#0096ff15]"
        >
          {[
            { value: t.stat1Value, label: t.stat1Label },
            { value: t.stat2Value, label: t.stat2Label },
            { value: t.stat3Value, label: t.stat3Label },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-black text-4xl md:text-5xl text-white mb-1 glow-text">
                {stat.value}
              </div>
              <div className="text-xs font-mono text-[#60a5fa] uppercase tracking-widest">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, #02112A)",
        }}
      />
    </section>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

const serviceIcons = [Instagram, TrendingUp, Code2, Target];

function Services({ t }: { t: typeof translations["en"]["services"] }) {
  return (
    <section id="services" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <SectionTag label={t.sectionTag} />
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white mt-2 mb-4">
            {t.sectionTitle}
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">{t.sectionSub}</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.items.map((item, i) => {
            const Icon = serviceIcons[i];
            return (
              <FadeIn key={i} delay={i * 0.1} direction="up">
                <motion.div
                  whileHover={{ y: -6, borderColor: "rgba(0,150,255,0.6)" }}
                  transition={{ duration: 0.3 }}
                  className="group relative p-6 rounded-2xl glass border border-[#0096ff15] hover:shadow-[0_0_30px_rgba(0,150,255,0.15)] transition-all duration-300 h-full cursor-default"
                >
                  {/* Icon */}
                  <div className="mb-5 w-12 h-12 rounded-xl bg-[#0096ff15] border border-[#0096ff30] flex items-center justify-center group-hover:bg-[#0096ff25] group-hover:border-[#0096ff60] transition-all duration-300">
                    <Icon className="w-5 h-5 text-electric" />
                  </div>

                  {/* Number */}
                  <div className="absolute top-5 right-5 font-mono text-xs text-[#0096ff30] group-hover:text-[#0096ff60] transition-colors">
                    0{i + 1}
                  </div>

                  <h3 className="font-display font-bold text-xl text-white mb-3 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {item.description}
                  </p>

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-[#0096ff00] to-transparent group-hover:via-[#0096ff40] transition-all duration-500" />
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

function PortfolioCard({ item, viewLabel }: { item: PortfolioItem; viewLabel: string }) {
  const color = getCategoryColor(item.category);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-2xl overflow-hidden border border-[#0096ff15] cursor-pointer"
    >
      {/* Image / Gradient placeholder */}
      <div className="aspect-video relative overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, 
              hsl(${(item.id * 47) % 360}, 60%, 8%) 0%, 
              hsl(${(item.id * 47 + 40) % 360}, 50%, 14%) 100%)`,
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,150,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,150,255,0.1) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Geometric accent */}
        <div
          className="absolute top-4 right-4 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: color }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BarChart3
            className="w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity duration-300"
            style={{ color }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-navy/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <ArrowUpRight className="w-8 h-8 text-electric mx-auto mb-2" />
            <span className="text-white font-semibold text-sm">{viewLabel}</span>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="p-4 glass border-t border-[#0096ff10]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-white text-base mb-0.5">
              {item.title}
            </h3>
            <span
              className="text-xs font-mono"
              style={{ color }}
            >
              {item.category}
            </span>
          </div>
          {item.result && (
            <div className="text-right">
              <div className="font-mono text-xs text-electric font-bold">
                {item.result}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Portfolio({ t }: { t: typeof translations["en"]["portfolio"] }) {
  // We use internal keys so the active tab doesn't break when toggling ES/EN
  const [activeKey, setActiveKey] = useState<"all" | "socialMedia" | "webDev" | "mediaBuying">("all");

  const filters = [
    { key: "all", label: t.categories.all },
    { key: "socialMedia", label: t.categories.socialMedia },
    { key: "webDev", label: t.categories.webDev },
    { key: "mediaBuying", label: t.categories.mediaBuying },
  ] as const;

  const filtered = portfolioItems.filter((item) => {
    if (activeKey === "all") return true;
    if (activeKey === "socialMedia") return item.category.includes("Social Media");
    if (activeKey === "webDev") return item.category.includes("Web Dev");
    if (activeKey === "mediaBuying") return item.category.includes("Media Buying");
    return true;
  });

  return (
    <section id="portfolio" className="py-24 relative">
      {/* Background accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,150,255,0.3), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <SectionTag label={t.sectionTag} />
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white mt-2 mb-4">
            {t.sectionTitle}
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">{t.sectionSub}</p>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.1} className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium font-mono transition-all duration-200",
                activeKey === key
                  ? "bg-electric text-white glow-electric-sm"
                  : "border border-[#0096ff30] text-muted hover:border-[#0096ff60] hover:text-white bg-transparent"
              )}
            >
              {label}
            </button>
          ))}
        </FadeIn>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <PortfolioCard item={item} viewLabel={t.viewProject} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────

function Team({ t }: { t: typeof translations["en"]["team"] }) {
  const tagColors: Record<string, string> = {
    CEO: "#0096FF",
    Creative: "#a855f7",
    Media: "#f59e0b",
    Dev: "#10b981",
    Social: "#ec4899",
    Data: "#06b6d4",
  };

  return (
    <section id="team" className="py-24 relative">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,150,255,0.05), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn className="text-center mb-16">
          <SectionTag label={t.sectionTag} />
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white mt-2 mb-4">
            {t.sectionTitle}
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">{t.sectionSub}</p>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {teamMembers.map((member, i) => (
            <FadeIn key={member.id} delay={i * 0.08} direction="up">
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className="group text-center"
              >
                {/* Avatar */}
                <div className="relative mx-auto mb-4 w-20 h-20 lg:w-24 lg:h-24">
                  {/* Ring */}
                  <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `conic-gradient(${tagColors[member.tag || "CEO"] || "#0096FF"}, transparent, ${tagColors[member.tag || "CEO"] || "#0096FF"})`,
                      padding: "2px",
                      borderRadius: "9999px",
                      animation: "spin 3s linear infinite",
                    }}
                  />

                  {/* Avatar circle */}
                  <div
                    className="absolute inset-0.5 rounded-full flex items-center justify-center border border-[#0096ff20] group-hover:border-[#0096ff50] transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, 
                        hsl(${(member.id * 55) % 360}, 50%, 12%) 0%, 
                        hsl(${(member.id * 55 + 60) % 360}, 40%, 18%) 100%)`,
                    }}
                  >
                    <span className="font-display font-black text-2xl text-white">
                      {member.name[0]}
                    </span>
                  </div>

                  {/* Tag badge */}
                  {member.tag && (
                    <div
                      className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-white"
                      style={{ background: tagColors[member.tag] || "#0096FF" }}
                    >
                      {member.tag}
                    </div>
                  )}
                </div>

                <h3 className="font-display font-bold text-white text-sm mb-1 leading-tight">
                  {member.name}
                </h3>
                <p className="text-[#60a5fa] text-xs font-mono leading-snug">
                  {member.role}
                </p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function Clients({ t }: { t: typeof translations["en"]["clients"] }) {
  const doubled = [...clientLogos, ...clientLogos];

  return (
    <section id="clients" className="py-24 relative">
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,150,255,0.3), transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <SectionTag label={t.sectionTag} />
          <h2 className="font-display font-black text-4xl md:text-5xl text-white mt-2 mb-4">
            {t.sectionTitle}
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">{t.sectionSub}</p>
        </FadeIn>

        {/* Marquee */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, #02112A, transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, #02112A, transparent)" }}
          />

          <div className="flex animate-marquee gap-8 w-max">
            {doubled.map((client, i) => (
              <motion.div
                key={`${client.id}-${i}`}
                whileHover={{ scale: 1.05 }}
                className="shrink-0 flex items-center justify-center w-36 h-16 rounded-xl glass border border-[#0096ff10] hover:border-[#0096ff35] transition-all duration-200 cursor-default"
              >
                <span className="font-display font-bold text-sm text-muted opacity-60 hover:opacity-100 transition-opacity">
                  {client.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTABanner({ t }: { t: typeof translations["en"]["hero"] }) {
  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,150,255,0.08) 0%, rgba(2,17,42,0) 50%, rgba(0,150,255,0.06) 100%)",
        }}
      />
      <div className="absolute inset-0 border-y border-[#0096ff15]" />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-[#0096ff40]" />
      <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-[#0096ff40]" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-[#0096ff40]" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-[#0096ff40]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="font-display font-black text-4xl md:text-6xl text-white mb-4 leading-tight">
            Ready to{" "}
            <span className="text-electric glow-text">Dominate</span>?
          </h2>
          <p className="text-muted text-lg mb-8 max-w-lg mx-auto">
            {t.ctaSub}
          </p>
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{
              scale: 1.06,
              boxShadow:
                "0 0 50px rgba(0,150,255,0.5), 0 0 100px rgba(0,150,255,0.2)",
            }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-electric text-white font-bold text-xl glow-electric transition-all duration-300"
          >
            <MessageCircle className="w-6 h-6" />
            {t.cta}
            <ArrowUpRight className="w-5 h-5" />
          </motion.a>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ t }: { t: typeof translations["en"]["footer"] }) {
  return (
    <footer className="relative border-t border-[#0096ff10] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-electric flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" fill="white" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Pro<span className="text-electric">-DG</span>
              </span>
            </div>
            <p className="text-[#60a5fa] text-xs font-mono">{t.tagline}</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-muted-dim">
            <a href="#" className="hover:text-electric transition-colors">
              {t.links.privacy}
            </a>
            <a href="#" className="hover:text-electric transition-colors">
              {t.links.terms}
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-electric transition-colors"
            >
              {t.links.contact}
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-[#60a5fa40] font-mono">{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [lang, setLang] = useState<Language>("es");
  const t = translations[lang];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
      `}</style>

      <div
        className="min-h-screen relative"
        style={{ backgroundColor: "#02112A" }}
      >
        <Nav lang={lang} setLang={setLang} t={t.nav} />
        <Hero t={t.hero} />
        <Services t={t.services} />
        <Portfolio t={t.portfolio} />
        <Team t={t.team} />
        <Clients t={t.clients} />
        <CTABanner t={t.hero} />
        <Footer t={t.footer} />
      </div>
    </>
  );
}