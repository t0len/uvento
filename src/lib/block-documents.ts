import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "block-documents";
const MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_SECONDS = 60 * 10;

const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BY_EXTENSION: Record<string, { type: string; ext: string }> = {
  pdf: { type: "application/pdf", ext: "pdf" },
  jpg: { type: "image/jpeg", ext: "jpg" },
  jpeg: { type: "image/jpeg", ext: "jpg" },
  png: { type: "image/png", ext: "png" },
  webp: { type: "image/webp", ext: "webp" },
};

function storage(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(client: SupabaseClient) {
  const { error } = await client.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(TYPES),
  });
  if (!error || error.message.toLowerCase().includes("already exists")) return;
  throw error;
}

function fileKind(file: File): { type: string; ext: string } | null {
  if (TYPES[file.type]) return { type: file.type, ext: TYPES[file.type] };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? null;
}

function displayName(name: string) {
  const cleaned = name.replace(/[/\\]/g, "").trim();
  return (cleaned || "document").slice(0, 120);
}

export async function saveBlockDocument(
  file: File,
  organizationId: string,
): Promise<{ path?: string; name?: string; error?: "documentType" | "documentSize" | "documentUpload" }> {
  if (!file || file.size === 0) return {};
  const kind = fileKind(file);
  if (!kind) return { error: "documentType" };
  if (file.size > MAX_BYTES) return { error: "documentSize" };

  const client = storage();
  if (!client) return { error: "documentUpload" };

  const path = `${organizationId}/${randomUUID()}.${kind.ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const upload = () =>
    client.storage.from(BUCKET).upload(path, body, {
      contentType: kind.type,
      upsert: false,
    });

  let uploaded = await upload();
  if (uploaded.error && uploaded.error.message.toLowerCase().includes("bucket")) {
    try {
      await ensureBucket(client);
    } catch {
      return { error: "documentUpload" };
    }
    uploaded = await upload();
  }
  if (uploaded.error) return { error: "documentUpload" };
  return { path, name: displayName(file.name) };
}

export async function deleteBlockDocument(path: string | null | undefined) {
  if (!path || path.includes("..")) return;
  const client = storage();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) console.error("block document delete failed");
}

export async function signedBlockDocumentUrl(path: string) {
  if (!path || path.includes("..")) return null;
  const client = storage();
  if (!client) return null;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
