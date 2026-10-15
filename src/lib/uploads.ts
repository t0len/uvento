import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "event-covers";
const MAX_BYTES = 400 * 1024;
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

function storage(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(client: SupabaseClient) {
  const { error } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  });
  if (!error || error.message.toLowerCase().includes("already exists")) return;
  throw error;
}

export async function saveEventImage(file: File): Promise<{ url?: string; error?: string }> {
  if (!file || file.size === 0) return {};

  const allowed = file.type === "image/jpeg" || file.type === "image/png";
  if (!allowed) return { error: "imageType" };
  if (file.size > MAX_BYTES) return { error: "imageSize" };

  const client = storage();
  if (!client) return { error: "imageUpload" };

  const filename = `${randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
  const body = Buffer.from(await file.arrayBuffer());
  let uploaded = await client.storage.from(BUCKET).upload(filename, body, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploaded.error && uploaded.error.message.toLowerCase().includes("bucket")) {
    try {
      await ensureBucket(client);
    } catch {
      return { error: "imageUpload" };
    }
    uploaded = await client.storage.from(BUCKET).upload(filename, body, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  }

  if (uploaded.error) return { error: "imageUpload" };
  const { data } = client.storage.from(BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl };
}

export async function deleteEventImage(url: string | null | undefined) {
  if (!url) return;
  const index = url.indexOf(PUBLIC_MARKER);
  if (index === -1) return;
  const client = storage();
  if (!client) return;
  const path = decodeURIComponent(url.slice(index + PUBLIC_MARKER.length).split("?")[0]);
  if (!path) return;
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) console.error("cover delete failed");
}
