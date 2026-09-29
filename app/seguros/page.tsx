import SegurosPage, { segurosMetadata } from "./SegurosPage";

// English address of the quote page (the Spanish one is /es/seguros).
export const metadata = segurosMetadata("en");

export default function Page() {
  return <SegurosPage lang="en" />;
}
