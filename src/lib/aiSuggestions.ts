export interface AISuggestion {
  label: string;
  /** in-app route to navigate to, if the suggestion is an action */
  to?: string;
  /** follow-up question to send back to the assistant */
  ask?: string;
}

const DEFAULT_SUGGESTIONS: AISuggestion[] = [
  { label: "Browse Properties", to: "/properties" },
  { label: "How Secure Payment works", ask: "How does Secure Payment work on Prop-Connect?" },
  { label: "Explain Trust Score", ask: "Explain the Prop-Connect Trust Score." },
];

interface Rule {
  match: RegExp;
  suggestions: AISuggestion[];
}

const RULES: Rule[] = [
  {
    match: /\b(buy|buying|purchase|looking for a (house|home|land)|rent|renting)\b/i,
    suggestions: [
      { label: "Browse Properties", to: "/properties" },
      { label: "Find an Agent", to: "/agents" },
      { label: "Start Reservation", to: "/properties" },
      { label: "How Secure Payment works", ask: "Walk me through the secure payment and escrow steps." },
    ],
  },
  {
    match: /\b(sell|selling|list my|become an agent|landlord|developer)\b/i,
    suggestions: [
      { label: "Become an Agent", to: "/register" },
      { label: "Verify Account", to: "/identity-verification" },
      { label: "Add Property", to: "/add-property" },
      { label: "Agent subscription", ask: "How much is the agent subscription and what do I get?" },
    ],
  },
  {
    match: /\b(escrow|secure payment|payment|refund|proof of payment)\b/i,
    suggestions: [
      { label: "Secure Payments", to: "/buyer-secure-payments" },
      { label: "Wallet", to: "/earnings" },
      { label: "Talk to an Agent", to: "/agents" },
      { label: "Dispute process", ask: "What happens if I raise a dispute on an escrow transaction?" },
    ],
  },
  {
    match: /\b(kyc|verify|verification|trust score|badge)\b/i,
    suggestions: [
      { label: "Verify Identity", to: "/identity-verification" },
      { label: "Trust Score explained", ask: "How is my Trust Score calculated and how do I raise it?" },
      { label: "Settings", to: "/settings" },
    ],
  },
  {
    match: /\b(referral|matrix|bonus|commission|withdraw|withdrawal|earnings)\b/i,
    suggestions: [
      { label: "Earnings & Wallet", to: "/earnings" },
      { label: "Referral programme", ask: "How does the Prop-Connect referral matrix pay out?" },
      { label: "Request Withdrawal", to: "/earnings" },
    ],
  },
  {
    match: /\b(fraud|scam|safe|safety|fake|due diligence|document|c of o|survey)\b/i,
    suggestions: [
      { label: "Property safety tips", ask: "How do I avoid property fraud in Nigeria?" },
      { label: "Verified Agents", to: "/agents" },
      { label: "Browse Properties", to: "/properties" },
    ],
  },
  {
    match: /\b(subscription|subscribe|plan|renew)\b/i,
    suggestions: [
      { label: "Subscription & Payments", to: "/payments" },
      { label: "Verify Account", to: "/identity-verification" },
    ],
  },
];

/** Derive contextual quick actions from the latest exchange. */
export function getSuggestions(lastUser: string, lastAssistant = ""): AISuggestion[] {
  const haystack = `${lastUser} ${lastAssistant}`;
  const hit = RULES.find((r) => r.match.test(haystack));
  return (hit?.suggestions ?? DEFAULT_SUGGESTIONS).slice(0, 4);
}
