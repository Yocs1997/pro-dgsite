import { Mail } from "lucide-react";

// "Write to this person" from anywhere in the portal: opens Correo → Redactar with the
// address filled in, so the email goes out (and is tracked) through the portal instead
// of a personal mail app.

export const composeHref = (to: string, subject = "") =>
  `/agentes/correo?to=${encodeURIComponent(to)}${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`;

export default function EmailButton({
  to,
  subject,
  label = "Enviar correo",
  icon = false,
  className,
}: {
  to: string;
  subject?: string;
  label?: string;
  icon?: boolean; // icon only (tables, tight rows)
  className?: string;
}) {
  if (!to || !to.includes("@")) return null;
  return (
    <a
      href={composeHref(to, subject)}
      title={`Escribirle a ${to} desde el portal`}
      className={
        className ??
        (icon
          ? "inline-flex p-1.5 rounded-full hover:bg-white/10 text-[#7cc4ff]"
          : "flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm")
      }
    >
      <Mail className={icon ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {!icon && label}
    </a>
  );
}
