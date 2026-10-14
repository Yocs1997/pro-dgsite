import TagsShell, { tagsMetadata } from "../../tags/TagsShell";

// Spanish address of the tags & registration page: same page as /tags, opening in Spanish.
export const metadata = tagsMetadata("es");

export default function Page() {
  return <TagsShell lang="es" />;
}
