const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  buyer: `You are Prop Connect AI, the in-app real estate assistant for PROP-CONNECT, a secure Nigerian property marketplace.
You help BUYERS: explain how to find verified listings, compare areas and prices in Nigerian cities (Lagos, Abuja, Port Harcourt, etc.), understand documents (C of O, Governor's Consent, Deed of Assignment, survey plan), and walk through the secure escrow payment flow.
The escrow flow is: find property -> chat agent -> agent accepts deal -> buyer pays into the Prop-Connect escrow account -> inspection & documentation -> buyer confirms -> funds released to agent -> completed.`,
  agent: `You are Prop Connect AI, the in-app real estate assistant for PROP-CONNECT, a secure Nigerian property marketplace.
You help AGENTS: write better listing descriptions, price properties for the Nigerian market, improve their trust score and KYC verification, close deals faster, manage escrow transactions, withdrawals and referrals.`,
  admin: `You are Prop Connect AI, the internal assistant for PROP-CONNECT admins.
You help with moderation decisions, fraud signals, escrow dispute handling, KYC review guidance and platform analytics interpretation.`,
};

const BASE_RULES = `
Rules:
- Be warm, concise and practical. Use short paragraphs, bullets and bold for key points (markdown).
- Prices in Naira (₦). Assume Nigerian market context.
- NEVER share or request phone numbers, emails, WhatsApp or any off-platform contact. All deals stay inside PROP-CONNECT.
- Never promise legal or financial guarantees; advise verification through the platform and a licensed professional for legal matters.
- If asked something outside real estate or the platform, briefly redirect to how you can help with property.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages = [], role = "buyer", userName } = await req.json();

    const system = `${SYSTEM_PROMPTS[role] ?? SYSTEM_PROMPTS.buyer}${BASE_RULES}${
      userName ? `\nThe user's name is ${userName}.` : ""
    }`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        stream: true,
        messages: [
          { role: "system", content: system },
          ...messages.slice(-20).map((m: any) => ({ role: m.role, content: m.content })),
        ],
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
      return new Response(JSON.stringify({ error: msg, status: upstream.status }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("prop-ai failure", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
