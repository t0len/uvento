import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;

export async function saveEventImage(file: File): Promise<{ url?: string; error?: string }> {
  if (!file || file.size === 0) return {};

  const allowed = file.type === "image/jpeg" || file.type === "image/png";
  if (!allowed) return { error: "imageType" };
  if (file.size > MAX_BYTES) return { error: "imageSize" };

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${filename}` };
}
