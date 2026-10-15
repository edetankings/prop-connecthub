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
- Financial operations and subscriptions are unavailable until platform business rules and payment configuration are approved. Never instruct users to transfer funds while unavailable.
- Wallet & Withdrawals: earnings land in the wallet; withdrawals are reviewed and paid by admins.
- Referral allocations require approved rules. Verification bonuses are disabled. Never promise rewards or a subscription duration.
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


// --- Real listing search: parses simple filters from the latest user message
// and queries ONLY public, approved listings through the caller's own RLS context.
const NAIRA_UNITS: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, mil: 1e6, b: 1e9, billion: 1e9 };
function parseFilters(text: string) {
  const t = text.toLowerCase();
  const f: { maxPrice?: number; beds?: number; rent?: boolean; sale?: boolean; place?: string; type?: string } = {};
  const money = t.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|within|up to|₦|n)\s*₦?\s*([\d.,]+)\s*(k|thousand|m|million|mil|b|billion)?/);
  if (money) {
    const n = parseFloat(money[1].replace(/,/g, ""));
    if (!isNaN(n)) f.maxPrice = n * (money[2] ? NAIRA_UNITS[money[2]] : 1);
  }
  const beds = t.match(/(\d+)\s*(?:-|\s)?(?:bed|bedroom|br\b)/);
  if (beds) f.beds = parseInt(beds[1]);
  if (/\b(rent|rental|lease|let)\b/.test(t)) f.rent = true;
  if (/\b(buy|purchase|for sale|sale)\b/.test(t)) f.sale = true;
  const place = t.match(/\bin\s+([a-z][a-z\s-]{2,30}?)(?:\s+(?:under|below|for|with|within|around|budget)|[,.?!]|$)/);
  if (place) f.place = place[1].trim();
  const type = t.match(/\b(duplex|bungalow|flat|apartment|terrace|land|mansion|studio|penthouse|detached)\b/);
  if (type) f.type = type[1];
  return f;
}
const looksLikeSearch = (t: string) => /\b(find|show|search|looking|need|want|recommend|any|list|available)\b.*\b(house|home|property|properties|apartment|flat|duplex|bungalow|land|bed|rent|buy)/i.test(t)
  || /\b\d+\s*(bed|bedroom)/i.test(t);

async function searchListings(supabase: any, text: string) {
  const f = parseFilters(text);
  let q = supabase.from("properties")
    .select("id, title, price, city, state, bedrooms, bathrooms, property_type, status, property_code")
    .eq("is_verified", true)
    .in("status", ["for_sale", "for_rent", "available"])
    .order("created_at", { ascending: false })
    .limit(6);
  if (f.rent && !f.sale) q = q.eq("listing_type", "rental");
  if (f.sale && !f.rent) q = q.eq("listing_type", "sale");
  if (f.maxPrice) q = q.lte("price", f.maxPrice);
  if (f.beds) q = q.gte("bedrooms", f.beds);
  if (f.place) {
    const safe = f.place.replace(/[^a-z\s-]/g, "");
    q = q.or(`city.ilike.%${safe}%,state.ilike.%${safe}%,address.ilike.%${safe}%`);
  }
  if (f.type) q = q.ilike("property_type", `%${f.type}%`);
  const { data, error } = await q;
  if (error) { console.error("listing search failed", error.message); return { f, rows: [] }; }
  return { f, rows: data || [] };
}

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

    const token = authHeader.replace("Bearer ", "").trim();
    let userId: string | undefined;
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) {
      // Fallback for tokens getClaims cannot verify locally (e.g. legacy signing keys).
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      userId = userData?.user?.id;
      if (!userId) {
        console.error("prop-ai auth rejected", claimsError?.message, userError?.message);
        return fail("Your session expired. Please sign in again.", 401);
      }
    }


    // Opt-in only. Provider/model and paid usage require an owner decision.
    const apiKey = Deno.env.get("AI_API_KEY");
    const endpoint = Deno.env.get("AI_CHAT_COMPLETIONS_URL");
    const model = Deno.env.get("AI_MODEL");
    if (Deno.env.get("AI_ENABLED") !== "true" || !apiKey || !endpoint || !model) {
      return fail("The assistant is not configured yet. Please use property search or contact support.", 503);
    }
    let upstreamUrl: URL;
    try { upstreamUrl = new URL(endpoint); } catch { return fail("AI configuration is invalid", 503); }
    if (upstreamUrl.protocol !== "https:" || upstreamUrl.username || upstreamUrl.password || upstreamUrl.search || upstreamUrl.hash) {
      return fail("AI configuration is invalid", 503);
    }

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

    let listingContext = "";
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    if (looksLikeSearch(lastUser)) {
      const { f, rows } = await searchListings(supabase, lastUser);
      listingContext = rows.length
        ? `\n\nREAL PROP-CONNECT LISTINGS matching the user's request (filters: ${JSON.stringify(f)}). Present them as a short markdown list. Each item MUST be a link in the form [Title](/property/ID) followed by price in ₦, location, bedrooms and Property ID. Only use these listings — never invent properties:\n` +
          rows.map((r: any) => `- id=${r.id} | ${r.title} | ₦${Number(r.price).toLocaleString()} | ${[r.city, r.state].filter(Boolean).join(", ")} | ${r.bedrooms ?? "?"} bed | ${r.status === "for_rent" ? "rent" : "sale"} | ${r.property_code ?? ""}`).join("\n")
        : `\n\nA search of real PROP-CONNECT listings found NO matches for filters ${JSON.stringify(f)}. Say so honestly, suggest widening budget/location, and link to [browse all properties](/properties). Never invent listings.`;
    }

    const upstream = await fetch(upstreamUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: system + listingContext + "\nNever share agent phone numbers, emails or other users' data. Never guarantee legal title, returns or financial outcomes." }, ...messages],
      }),
    });

    if (!upstream.ok) {
      await upstream.body?.cancel();
      console.error("AI provider request failed", upstream.status);
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
