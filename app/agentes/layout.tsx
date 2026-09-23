import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Agentes | Pro-DG",
  robots: { index: false, follow: false },
};

export default function AgentesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html, body { background-color: #0B2B5E !important; }
      `}</style>
      <div
        className="min-h-screen relative overflow-x-hidden text-white"
        style={{
          backgroundColor: "#0B2B5E",
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(51,170,255,0.28), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,150,255,0.18), transparent 70%)",
        }}
      >
        <div className="absolute inset-0 grid-lines opacity-70 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    </>
  );
}
