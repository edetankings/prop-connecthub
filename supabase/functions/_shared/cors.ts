// Shared, origin-restricted CORS helper for all PROP-CONNECT edge functions.
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/prop-connecthub\.lovable\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/,
  /^https:\/\/([a-z0-9-]+\.)*lovable\.dev$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

/** Returns CORS headers echoing the request origin only when it is allow-listed. */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (isAllowedOrigin(origin)) {
    return { ...BASE_HEADERS, "Access-Control-Allow-Origin": origin! };
  }
  // No Allow-Origin header => browsers block the response for disallowed origins.
  return { ...BASE_HEADERS };
}
