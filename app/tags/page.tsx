import TagsShell, { tagsMetadata } from "./TagsShell";

// English address of the tags & registration page (the Spanish one is /es/tags).
export const metadata = tagsMetadata("en");

export default function Page() {
  return <TagsShell lang="en" />;
}
