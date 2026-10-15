// supabase/functions/verify-phone-otp/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsFor } from "../_shared/cors.ts";



async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (Deno.env.get("OTP_ENABLED") !== "true") return json({ error: "Phone verification is not configured yet." }, 503);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { phone, code } = await req.json().catch(() => ({ phone: "", code: "" }));
    if (typeof phone !== "string" || !phone.trim()) return json({ error: "Phone is required" }, 400);
    if (typeof code !== "string" || code.length < 4 || code.length > 6) return json({ error: "Invalid code" }, 400);

    const normalized = phone.replace(/\s+/g, "");

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });
    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: challenge, error: chErr } = await supabaseAdmin
      .from("phone_otp_challenges")
      .select("id, otp_hash, expires_at, attempts, max_attempts")
      .eq("phone", normalized)
      .eq("purpose", "verify_phone")
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chErr) return json({ error: chErr.message }, 500);
    if (!challenge) return json({ error: "OTP not found. Please resend." }, 400);

    const expiresAt = new Date(challenge.expires_at).getTime();
    if (Date.now() > expiresAt) return json({ error: "OTP expired. Please resend." }, 400);

    if ((challenge.attempts ?? 0) >= (challenge.max_attempts ?? 3)) {
      return json({ error: "Too many attempts. Please resend OTP." }, 429);
    }

    // Reserve each attempt atomically before checking the code, including
    // concurrent requests. Only one request can advance a given attempts value.
    const nextAttempt = (challenge.attempts ?? 0) + 1;
    const { data: reserved, error: reserveError } = await supabaseAdmin.from("phone_otp_challenges")
      .update({ attempts: nextAttempt }).eq("id", challenge.id)
      .eq("attempts", challenge.attempts ?? 0).gte("expires_at", new Date().toISOString()).select("id");
    if (reserveError) return json({ error: "Could not verify code. Please retry." }, 500);
    if (!reserved?.length) return json({ error: "Verification changed. Please retry." }, 409);
    const expected = await sha256(`${normalized}:${code}:${SUPABASE_SERVICE_ROLE_KEY}`);
    if (expected !== challenge.otp_hash) return json({ error: "Invalid OTP." }, 400);
    // Consume the successful challenge before making privileged profile writes.
    const { data: consumed, error: consumeError } = await supabaseAdmin.from("phone_otp_challenges")
      .delete().eq("id", challenge.id).eq("attempts", nextAttempt).select("id");
    if (consumeError || !consumed?.length) return json({ error: "Code already used or changed. Please resend." }, 409);

    // Success: mark profile phone verified
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ phone: normalized, phone_verified: true, phone_verified_at: new Date().toISOString() })
      .eq("user_id", userRes.user.id);
    if (profErr) return json({ error: profErr.message }, 500);

    // Mark verification step approved
    await supabaseAdmin
      .from("verification_steps")
      .update({ status: "approved" })
      .eq("user_id", userRes.user.id)
      .eq("step_name", "phone_otp");

    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
