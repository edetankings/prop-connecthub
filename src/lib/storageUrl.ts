import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a stored value to a usable URL.
 * - Reject absolute URLs for private objects, including legacy public URLs.
 * - Otherwise treat it as a storage object path and create a short-lived
 *   signed URL from the given private bucket.
 */
export async function resolveSignedUrl(
  bucket: string,
  value: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!value) return null;
  // Private objects are represented by relative paths. Never trust a legacy
  // public URL or an arbitrary external URL for sensitive documents.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.split("/").includes("..")) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(value, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
