const MAX_EDGE = 1200;
const MAX_BYTES = 400 * 1024;

export async function compressCover(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("canvas");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.72;
  let blob: Blob | null = null;
  while (quality >= 0.4) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) break;
    quality -= 0.08;
  }
  if (!blob || blob.size > MAX_BYTES) throw new Error("too big");
  return new File([blob], "cover.jpg", { type: "image/jpeg" });
}
