export type Language = "en" | "es";

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  imagePath: string;
  tag?: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: 
    | "Social Media" 
    | "Web Dev" 
    | "Media Buying"
    | "Social Media, Web Development & Media Buying"
    | "Social Media & Media Buying"
    | "Social Media, Branding & Media Buying";
  imagePath: string;
  result?: string;
}

export interface ClientLogo {
  id: number;
  name: string;
  imagePath: string;
}

export interface Translations {
  nav: {
    services: string;
    portfolio: string;
    team: string;
    clients: string;
    cta: string;
  };
  hero: {
    badge: string;
    headline1: string;
    headline2: string;
    headline3: string;
    subheadline: string;
    cta: string;
    ctaSub: string;
    stat1Value: string;
    stat1Label: string;
    stat2Value: string;
    stat2Label: string;
    stat3Value: string;
    stat3Label: string;
  };
  services: {
    sectionTag: string;
    sectionTitle: string;
    sectionSub: string;
    items: {
      title: string;
      description: string;
    }[];
  };
  portfolio: {
    sectionTag: string;
    sectionTitle: string;
    sectionSub: string;
    viewProject: string;
    categories: {
      all: string;
      socialMedia: string;
      webDev: string;
      mediaBuying: string;
    };
  };
  team: {
    sectionTag: string;
    sectionTitle: string;
    sectionSub: string;
  };
  clients: {
    sectionTag: string;
    sectionTitle: string;
    sectionSub: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    links: {
      privacy: string;
      terms: string;
      contact: string;
    };
  };
}

// ─── Team Members ───────────────────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Yader Calderon",
    role: "Founder & Director",
    imagePath: "/images/team/yader.jpg",
    tag: "CEO",
  },
  {
    id: 2,
    name: "Massiel Caldera",
    role: "Creative Director",
    imagePath: "/images/team/valeria.jpg",
    tag: "Creative",
  },
  {
    id: 3,
    name: "Scarleth Orozco",
    role: "Marketing Lead",
    imagePath: "/images/team/carlos.jpg",
    tag: "Media",
  },
  {
    id: 4,
    name: "Freddy Maradiaga",
    role: "Audiovisual producer",
    imagePath: "/images/team/sofia.jpg",
    tag: "Dev",
  },
];

// ─── Portfolio Items ─────────────────────────────────────────────────────────

export const portfolioItems: PortfolioItem[] = [
  {
    id: 1,
    title: "Tag Express",
    category: "Social Media, Web Development & Media Buying",
    imagePath: "/images/portfolio/technova.jpg",
    result: "+340% engagement",
  },
  {
    id: 2,
    title: "Frozzy Pop",
    category: "Social Media & Media Buying",
    imagePath: "/images/portfolio/fincore.jpg",
    result: "2.1s load time",
  },
  {
    id: 3,
    title: "NorteExpress",
    category: "Social Media & Media Buying",
    imagePath: "/images/portfolio/sportpulse.jpg",
    result: "4.8x ROAS",
  },
  {
    id: 4,
    title: "MyOffice Co-Working",
    category: "Social Media & Media Buying",
    imagePath: "/images/portfolio/econest.jpg",
    result: "+12K followers",
  },
  {
    id: 5,
    title: "Huber Rent-a-Car",
    category: "Social Media, Web Development & Media Buying",
    imagePath: "/images/portfolio/luxauto.jpg",
    result: "+89% conversion",
  },
  {
    id: 6,
    title: "SuperCargo",
    category: "Social Media, Branding & Media Buying",
    imagePath: "/images/portfolio/medibrand.jpg",
    result: "-38% CPA",
  },
];

// ─── Client Logos ────────────────────────────────────────────────────────────

export const clientLogos: ClientLogo[] = [
  { id: 1, name: "TagExpress", imagePath: "/images/clients/technova.svg" },
  { id: 2, name: "Frozzy Pop", imagePath: "/images/clients/fincore.svg" },
  { id: 3, name: "Norte Express", imagePath: "/images/clients/sportpulse.svg" },
  { id: 4, name: "Huber Rent-a-Car", imagePath: "/images/clients/econest.svg" },
  { id: 5, name: "MyOffice Co-Working", imagePath: "/images/clients/luxauto.svg" },
  { id: 6, name: "SuperCargo", imagePath: "/images/clients/medibrand.svg" },
  { id: 7, name: "Mary Autopartes", imagePath: "/images/clients/urbanhive.svg" },
  { id: 8, name: "Repuestos El Eden", imagePath: "/images/clients/quantex.svg" },
];

// ─── Translations ────────────────────────────────────────────────────────────

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      services: "Services",
      portfolio: "Portfolio",
      team: "Team",
      clients: "Clients",
      cta: "Get a Quote",
    },
    hero: {
      badge: "Digital Growth Agency",
      headline1: "We Build",
      headline2: "Brands That",
      headline3: "Dominate.",
      subheadline:
        "Pro-DG transforms businesses through precision digital marketing, world-class web development, and data-driven media buying strategies.",
      cta: "Get a Quote Now",
      ctaSub: "Free consultation · No commitment",
      stat1Value: "150+",
      stat1Label: "Clients Served",
      stat2Value: "4.8x",
      stat2Label: "Average ROAS",
      stat3Value: "98%",
      stat3Label: "Retention Rate",
    },
    services: {
      sectionTag: "What We Do",
      sectionTitle: "Full-Spectrum Digital Services",
      sectionSub:
        "Everything your brand needs to thrive in the digital landscape — under one roof.",
      items: [
        {
          title: "Social Media Management",
          description:
            "Strategic content creation, community management, and growth tactics that turn followers into loyal customers.",
        },
        {
          title: "Digital Marketing",
          description:
            "SEO, email campaigns, and conversion-focused strategies that build sustainable revenue pipelines.",
        },
        {
          title: "Web Development",
          description:
            "Lightning-fast, conversion-optimized websites and web apps built with modern technology stacks.",
        },
        {
          title: "Media Buying",
          description:
            "Precision-targeted ad spend across Meta, Google, TikTok, and programmatic channels for maximum ROI.",
        },
      ],
    },
    portfolio: {
      sectionTag: "Our Work",
      sectionTitle: "Results That Speak",
      sectionSub:
        "A curated selection of campaigns and projects that delivered measurable impact.",
      viewProject: "View Project",
      categories: {
        all: "All",
        socialMedia: "Social Media",
        webDev: "Web Dev",
        mediaBuying: "Media Buying",
      },
    },
    team: {
      sectionTag: "The Team",
      sectionTitle: "Meet the Experts",
      sectionSub:
        "A team of specialists who live and breathe digital — building strategies that actually move the needle.",
    },
    clients: {
      sectionTag: "Trusted By",
      sectionTitle: "Brands That Chose Pro-DG",
      sectionSub: "We're proud to partner with forward-thinking companies.",
    },
    footer: {
      tagline: "Building the future of digital marketing.",
      copyright: "© 2025 Pro-DG Digital Agency. All rights reserved.",
      links: {
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        contact: "Contact",
      },
    },
  },

  es: {
    nav: {
      services: "Servicios",
      portfolio: "Portafolio",
      team: "Equipo",
      clients: "Clientes",
      cta: "Cotizar",
    },
    hero: {
      badge: "Agencia de Crecimiento Digital",
      headline1: "Construimos",
      headline2: "Marcas Que",
      headline3: "Dominan.",
      subheadline:
        "Pro-DG transforma empresas a través de marketing digital de precisión, desarrollo web de clase mundial y estrategias de media buying basadas en datos.",
      cta: "Cotizar Ahora",
      ctaSub: "Consulta gratis · Sin compromiso",
      stat1Value: "150+",
      stat1Label: "Clientes Atendidos",
      stat2Value: "4.8x",
      stat2Label: "ROAS Promedio",
      stat3Value: "98%",
      stat3Label: "Tasa de Retención",
    },
    services: {
      sectionTag: "Lo Que Hacemos",
      sectionTitle: "Servicios Digitales Integrales",
      sectionSub:
        "Todo lo que tu marca necesita para prosperar en el entorno digital, bajo un mismo techo.",
      items: [
        {
          title: "Gestión de Redes Sociales",
          description:
            "Creación de contenido estratégico, gestión de comunidades y tácticas de crecimiento que convierten seguidores en clientes leales.",
        },
        {
          title: "Marketing Digital",
          description:
            "SEO, campañas de email y estrategias orientadas a conversión que construyen fuentes de ingresos sostenibles.",
        },
        {
          title: "Desarrollo Web",
          description:
            "Sitios web y aplicaciones ultrarrápidos, optimizados para conversión, construidos con tecnologías modernas.",
        },
        {
          title: "Compra de Medios",
          description:
            "Inversión publicitaria de alta precisión en Meta, Google, TikTok y canales programáticos para el máximo ROI.",
        },
      ],
    },
    portfolio: {
      sectionTag: "Nuestro Trabajo",
      sectionTitle: "Resultados Que Hablan",
      sectionSub:
        "Una selección de campañas y proyectos que entregaron impacto medible.",
      viewProject: "Ver Proyecto",
      categories: {
        all: "Todos",
        socialMedia: "Redes Sociales",
        webDev: "Web Dev",
        mediaBuying: "Compra de Medios",
      },
    },
    team: {
      sectionTag: "El Equipo",
      sectionTitle: "Conoce a los Expertos",
      sectionSub:
        "Un equipo de especialistas que viven y respiran lo digital, construyendo estrategias que realmente generan resultados.",
    },
    clients: {
      sectionTag: "Con la Confianza de",
      sectionTitle: "Marcas Que Eligieron Pro-DG",
      sectionSub:
        "Nos enorgullece asociarnos con empresas con visión de futuro.",
    },
    footer: {
      tagline: "Construyendo el futuro del marketing digital.",
      copyright: "© 2025 Pro-DG Agencia Digital. Todos los derechos reservados.",
      links: {
        privacy: "Política de Privacidad",
        terms: "Términos de Servicio",
        contact: "Contacto",
      },
    },
  },
};
