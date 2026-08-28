import { createClient } from "npm:@supabase/supabase-js@2";
import { corsFor } from "../_shared/cors.ts";

const SYSTEM_PROMPTS: Record<string, string> = {
  buyer: `You are Prop Connect AI, the in-app real estate assistant for PROP-CONNECT, a secure Nigerian property marketplace.
You help BUYERS: explain how to find verified listings, compare areas and prices in Nigerian cities (Lagos, Abuja, Port Harcourt, etc.), understand documents (C of O, Governor's Consent, Deed of Assignment, survey plan), and walk through the secure escrow payment flow.
The escrow flow is: find property -> chat agent -> agent accepts deal -> buyer pays into the Prop-Connect escrow account -> inspection & documentation -> buyer confirms -> funds released to agent -> completed.`,
  agent: `You are Prop Connect AI, the in-app real estate assistant for PROP-CONNECT, a secure Nigerian property marketplace.
You help AGENTS: write better listing descriptions, price properties for the Nigerian market, improve their trust score and KYC verification, close deals faster, manage escrow transactions, withdrawals and referrals.`,
  admin: `You are Prop Connect AI, the internal assistant for PROP-CONNECT admins.
You help with moderation decisions, fraud signals, escrow dispute handling, KYC review guidance and platform analytics interpretation.`,
};

const PLATFORM_KNOWLEDGE = `
PROP-CONNECT knowledge you must use:
- Property IDs look like PROP-LAG-AGENTREF-0001 (state code + agent ref + sequence). Referral codes look like PC-XXXXXX.
- Trust Score: agents start at 50, KYC verification adds 35 (capped at 100). Verified agents show a green badge.
- Verification/KYC: uploaded in Identity Verification; admins approve or reject with a reason.
- Secure Payment / Escrow: buyer requests a deal -> agent accepts -> buyer pays into the Prop-Connect company account and uploads proof -> admin verifies -> funds held in escrow -> buyer confirms handover -> funds released to the agent's wallet minus commission. 72-hour payment window; disputes and refunds are handled by admins.
- Commission: about 1% on sales and 5% on rentals (admin configurable).
- Subscriptions: agents pay ₦7,500/month by manual bank transfer to unlock listing features.
- Wallet & Withdrawals: earnings land in the wallet; withdrawals are reviewed and paid by admins.
- Referrals/Matrix: 15-level matrix with direct-referral and verification bonuses paid in Naira.
- Reservations & chat: buyers start chats (agents cannot); contact details are blocked in messages for safety.
- Useful pages: /properties, /agents, /messages, /verification, /earnings, /payments, /settings, /add-property, /dashboard/buyer/secure-payments.`;

const BASE_RULES = `
Rules:
- Be warm, professional, human and concise — never robotic. Use short paragraphs, bullets and bold for key points (markdown).
- Remember everything said earlier in this conversation: the property, budget, state, and intent the user already gave. Never re-ask for details already provided.
- When a request is incomplete (e.g. "I want to buy a house"), ask ONE natural follow-up at a time: state, then budget, then property type.
- Prices in Naira (₦). Assume Nigerian market context.
- Guide users to the right in-app page by name (e.g. "open Properties" or "go to Identity Verification") instead of external links.
- NEVER share or request phone numbers, emails, WhatsApp or any off-platform contact. All deals stay inside PROP-CONNECT.
- Never promise legal or financial guarantees; investment answers stay general guidance and recommend professional/legal verification.
- Never reveal or reference other users' private conversations or personal data.
- If asked something outside real estate or the platform, briefly redirect to how you can help with property.
${PLATFORM_KNOWLEDGE}`;

const MAX_MESSAGES = 40;
const MAX_CHARS = 4000;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const fail = (error: string, status: number) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return fail("Method not allowed", 405);

    // --- Authentication: signed-in users only ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return fail("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) return fail("Unauthorized", 401);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return fail("AI is not configured", 500);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail("Invalid request body", 400);

    const rawMessages = Array.isArray((body as any).messages) ? (body as any).messages : [];
    const messages = rawMessages
      .filter(
        (m: any) =>
          m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      )
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    if (messages.length === 0) return fail("At least one message is required", 400);

    const requestedRole = typeof (body as any).role === "string" ? (body as any).role : "buyer";

    // --- Authorization: the role prompt must match the caller's real profile ---
    const [{ data: profile }, { data: isAdmin }] = await Promise.all([
      supabase.from("profiles").select("profile_type, full_name").eq("user_id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);

    let role: "buyer" | "agent" | "admin" = "buyer";
    if (isAdmin === true) role = "admin";
    else if (profile?.profile_type === "agent" || profile?.profile_type === "builder") role = "agent";
    // Never grant a higher-privilege prompt than the caller actually holds.
    if (requestedRole === "buyer") role = role === "buyer" ? "buyer" : role;

    const userName =
      typeof profile?.full_name === "string" ? profile.full_name.split(" ")[0] : undefined;

    const system = `${SYSTEM_PROMPTS[role]}${BASE_RULES}${
      userName ? `\nThe user's name is ${userName}.` : ""
    }`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      console.error("AI gateway error", upstream.status, details);
      const msg =
        upstream.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : upstream.status === 402
          ? "AI credits exhausted. Please contact support."
          : "The assistant is unavailable right now.";
      return fail(msg, upstream.status);
    }

    return new Response(upstream.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prop-ai failure", e);
    return fail("Unexpected error", 500);
  }
});
