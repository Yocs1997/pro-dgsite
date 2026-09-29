import { getSession } from "../../../../_lib/auth";
import { getLicensePhoto } from "@/app/lib/server/insurance";

// Serves a driver's license photo to the admin only (never public, never cached).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "admin") return new Response("Not found", { status: 404 });
  const { id, n } = await params;
  const idx = Number(n);
  if (!/^[a-z0-9-]{1,64}$/i.test(id) || !(idx === 0 || idx === 1)) return new Response("Not found", { status: 404 });

  const dataUrl = await getLicensePhoto(id, idx);
  const m = dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": `inline; filename="licencia-${id}-${idx === 0 ? "frente" : "reverso"}.jpg"`,
    },
  });
}
