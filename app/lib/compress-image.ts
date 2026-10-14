// Resizes and compresses a photo in the browser before upload (JPEG data URL), so a
// phone picture fits in the form's request. Used by /seguros (license) and /tags (title, ID).

export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.82, target = 1_400_000, limit = 1_500_000 }: { maxSide?: number; quality?: number; target?: number; limit?: number } = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let q = quality;
    let out = canvas.toDataURL("image/jpeg", q);
    while (out.length > target && q > 0.4) {
      q -= 0.12;
      out = canvas.toDataURL("image/jpeg", q);
    }
    if (out.length > limit) throw new Error("too large");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
