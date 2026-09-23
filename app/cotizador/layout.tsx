import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cotizador de Equipos POS | Pro-DG",
  description:
    "Arma tu punto de venta: elige cajones de efectivo, impresoras, lectores, computadoras y la licencia XoloPOS y calcula tu total al instante.",
};

export default function CotizadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
