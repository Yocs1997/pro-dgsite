import SegurosPage, { segurosMetadata } from "../../seguros/SegurosPage";

// Spanish address of the quote page: same page as /seguros, opening in Spanish.
export const metadata = segurosMetadata("es");

export default function Page() {
  return <SegurosPage lang="es" />;
}
