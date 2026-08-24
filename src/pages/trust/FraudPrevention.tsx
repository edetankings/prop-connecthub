import InfoPage from "@/components/InfoPage";

const FraudPrevention = () => (
  <InfoPage
    path="/trust/fraud-prevention"
    title="Fraud Prevention, Reporting & Disputes"
    metaTitle="Fraud Prevention & Dispute Reporting | Prop Connect"
    metaDescription="How Prop Connect prevents property fraud in Nigeria, the warning signs to watch for, and how to report a scam or raise a dispute on a transaction."
    intro="Property fraud thrives on urgency, secrecy and off-platform payments. Prop Connect is built to remove all three."
    ctaLabel="Review your transactions"
    ctaTo="/payments"
    secondaryLabel="Contact support"
    secondaryTo="/settings"
    sections={[
      {
        heading: "How we design fraud out of the platform",
        bullets: [
          "Agents cannot cold-message buyers — conversations are always started by the buyer.",
          "Phone numbers, emails and external links are automatically filtered out of chat messages.",
          "Payments run through the company escrow account, never agent-to-buyer directly.",
          "Every listing carries a property code and every payment a traceable transaction ID.",
          "Administrative and financial actions are written to an immutable audit log.",
        ],
      },
      {
        heading: "Common property scams in Nigeria",
        bullets: [
          "Omo-onile and multiple-sale scams where the same land is sold to several buyers.",
          "Fake agents using photos copied from other listing websites.",
          "Forged Certificates of Occupancy or survey plans.",
          "Inspection or 'agreement' fees demanded before any property is shown.",
          "Impersonation of Prop Connect staff requesting transfers to a personal account.",
        ],
      },
      {
        heading: "Rules that keep you protected",
        bullets: [
          "Prop Connect will never ask you to pay an individual's personal bank account.",
          "Prop Connect staff will never request your password, OTP or card PIN.",
          "Never continue a deal that has moved off the platform — you lose escrow protection.",
        ],
      },
      {
        heading: "How to raise a dispute",
        bullets: [
          "Open the transaction from Secure Payments and choose Raise Dispute.",
          "State clearly what happened and attach evidence: photos, documents and the property code.",
          "The funds remain held while our compliance team investigates.",
          "You receive a written resolution, and where justified, a refund.",
        ],
      },
      {
        heading: "Report a scam or suspicious account",
        body: "Email propconnect0@gmail.com or call 08144954576 with the property code, transaction ID and any screenshots. Reports are treated confidentially. Accounts confirmed to be fraudulent are permanently removed and reported to the relevant authorities.",
      },
    ]}
  />
);

export default FraudPrevention;
