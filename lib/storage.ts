import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./supabase/config";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export function uploadsEnabled(): boolean {
  return Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY) && supabaseUrl());
}

/** Stores an image in the public Supabase Storage bucket "media" (created on first use). */
export async function uploadPublicImage(file: File, folder: "products" | "reviews" | "categories"): Promise<{ ok: true; url: string } | { ok: false; error: "disabled" | "type" | "size" | "failed" }> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const url = supabaseUrl();
  if (!key || !url) return { ok: false, error: "disabled" };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: "type" };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "size" };
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucket = "media";
  const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const put = () => supabase.storage.from(bucket).upload(path, body, { contentType: file.type, cacheControl: "31536000", upsert: false });
  let { error } = await put();
  if (error && /not found/i.test(error.message)) {
    await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: "3MB", allowedMimeTypes: Object.keys(TYPES) });
    ({ error } = await put());
  }
  if (error) {
    console.error("image upload failed", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
