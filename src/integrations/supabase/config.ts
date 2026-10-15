/** Validate public browser configuration without logging credential values. */
export function validateSupabaseConfig(url: unknown, key: unknown) {
  if (typeof url !== "string" || typeof key !== "string" || !url.trim() || !key.trim()) {
    throw new Error("Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the intended project.");
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("VITE_SUPABASE_URL must be a valid URL."); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" ||
      (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)))) {
    throw new Error("Use an HTTPS Supabase origin or a local development HTTP origin.");
  }
  if (key.startsWith("sb_secret_")) throw new Error("A server secret must never be used in browser configuration.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const part = key.split(".")[1];
      const claims = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      if (claims.role !== "anon") throw new Error();
    } catch { throw new Error("Use a public publishable key (or legacy anon key), never a service-role key."); }
  }
  return { url: parsed.origin, key };
}
