// supabase/functions/send-phone-otp/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsFor } from "../_shared/cors.ts";



function randomOtp() {
  const range = 900000;
  const limit = Math.floor(0x100000000 / range) * range;
  const sample = new Uint32Array(1);
  do { crypto.getRandomValues(sample); } while (sample[0] >= limit);
  return String(100000 + sample[0] % range);
}

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

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!twilioSid || !twilioToken || !twilioFrom) {
      return json(
        {
          error:
            "SMS provider is not configured (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)",
        },
        500,
      );
    }

    const { phone } = await req.json().catch(() => ({ phone: "" }));
    if (typeof phone !== "string" || !phone.trim()) return json({ error: "Phone is required" }, 400);

    const normalized = phone.replace(/\s+/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(normalized)) {
      return json({ error: "Phone must be in international format (e.g., +234...)" }, 400);
    }

    // Verify user (function requires auth by default)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });
    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resend throttle: 30s per phone
    const { data: lastChallenge } = await supabaseAdmin
      .from("phone_otp_challenges")
      .select("id, last_sent_at, expires_at")
      .eq("phone", normalized)
      .eq("purpose", "verify_phone")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    if (lastChallenge?.last_sent_at) {
      const lastSent = new Date(lastChallenge.last_sent_at).getTime();
      const secondsSince = Math.floor((now - lastSent) / 1000);
      if (secondsSince < 30) {
        return json({ error: `Please wait ${30 - secondsSince}s before resending` }, 429);
      }
    }

    const code = randomOtp();
    const otpHash = await sha256(`${normalized}:${code}:${SUPABASE_SERVICE_ROLE_KEY}`);
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from("phone_otp_challenges").insert({
      user_id: userRes.user.id,
      phone: normalized,
      purpose: "verify_phone",
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      max_attempts: 3,
      last_sent_at: new Date(now).toISOString(),
    });

    if (insertErr) return json({ error: insertErr.message }, 500);

    // Send SMS via Twilio
    const auth = btoa(`${twilioSid}:${twilioToken}`);
    const form = new URLSearchParams();
    form.set("From", twilioFrom);
    form.set("To", normalized);
    form.set("Body", `Your PropConnect OTP is ${code}. It expires in 5 minutes.`);

    const smsRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!smsRes.ok) {
      await smsRes.body?.cancel();
      console.error("SMS provider rejected request", smsRes.status);
      return json({ error: "SMS delivery failed. Please try again later." }, 502);
    }

    return json({ ok: true, expires_in_sec: 300, resend_after_sec: 30 });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
