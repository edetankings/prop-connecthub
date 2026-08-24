import InfoPage from "@/components/InfoPage";

const AgentVerification = () => (
  <InfoPage
    path="/trust/agent-verification"
    title="Agent Verification & Trust Scores"
    metaTitle="How Prop Connect Verifies Agents in Nigeria | Agent Verification"
    metaDescription="Every Prop Connect agent completes identity KYC, document review and phone verification. See how trust scores and verified badges are earned."
    intro="Anyone can call themselves an agent. On Prop Connect, only agents who pass identity verification can list property or receive a secured payment."
    ctaLabel="Find a verified agent"
    ctaTo="/agents"
    secondaryLabel="Become a verified agent"
    secondaryTo="/register"
    sections={[
      {
        heading: "What every agent must submit",
        bullets: [
          "A valid government-issued ID (NIN slip, driver's licence, voter's card or international passport).",
          "A live selfie matched against the submitted ID.",
          "NIN or BVN for identity confirmation.",
          "Proof of residential address.",
          "Bank account details in the agent's own name for payouts.",
          "A verified phone number confirmed by one-time password.",
        ],
      },
      {
        heading: "Our review process",
        bullets: [
          "Submissions are queued for manual review by the Prop Connect compliance team.",
          "Documents are checked for authenticity, legibility and name consistency.",
          "Failed submissions are returned with a specific reason so the agent can correct and resubmit.",
          "Approved agents receive a verified badge that appears on their profile and on every listing.",
        ],
      },
      {
        heading: "Trust scores",
        body: "A trust score summarises how dependable an agent has been on the platform. It combines completed identity verification with platform activity such as approved listings and successfully completed, dispute-free transactions. Scores are capped at 100 and update automatically — agents cannot edit their own score.",
      },
      {
        heading: "Ongoing accountability",
        bullets: [
          "Agents maintain an active subscription to keep listing privileges.",
          "Repeated disputes, misrepresentation or off-platform payment requests lead to suspension.",
          "All administrative actions on agent accounts are recorded in an audit log.",
        ],
      },
      {
        heading: "What verification does not mean",
        body: "A verified badge confirms that we have validated the agent's identity and documents. It is not a guarantee of any particular deal. Always inspect the property, review the title documents, and pay through Prop Connect escrow.",
      },
    ]}
  />
);

export default AgentVerification;
