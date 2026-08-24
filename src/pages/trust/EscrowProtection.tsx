import InfoPage from "@/components/InfoPage";

const EscrowProtection = () => (
  <InfoPage
    path="/trust/escrow-protection"
    title="Escrow Protection & Secure Payments"
    metaTitle="Escrow Protection for Nigerian Property Deals | Prop Connect"
    metaDescription="Learn how Prop Connect escrow protects your money: payment held securely, verified by our team, and released to the agent only after the deal is confirmed."
    intro="Your money never goes straight to an agent. Prop Connect holds every property payment securely and releases it only when the transaction has been verified."
    ctaLabel="Start a secure deal"
    sections={[
      {
        heading: "How a secure payment works",
        bullets: [
          "You request a deal on a property. The agent must accept the request before any payment can start.",
          "Once accepted, a secure transaction is created with a unique transaction ID and property code.",
          "You transfer the amount to the Prop Connect company account shown at checkout and upload your proof of payment.",
          "Our compliance team reviews the proof and marks the payment as secured.",
          "Funds are released to the agent only after the deal is confirmed — or refunded to you if it is not.",
        ],
      },
      {
        heading: "What escrow protects you from",
        bullets: [
          "Paying for a property that turns out not to exist or not to belong to the seller.",
          "Agents disappearing after collecting a deposit.",
          "Duplicate sales of the same unit to multiple buyers.",
          "Untraceable cash or personal-account transfers with no paper trail.",
        ],
      },
      {
        heading: "Timelines and expiry",
        body: "A secure transaction stays open for a limited window (72 hours) after it is created. If no valid proof of payment is uploaded within that window, the transaction expires automatically and the property returns to the open market — protecting agents from indefinite holds.",
      },
      {
        heading: "Refunds",
        bullets: [
          "If verification fails or the property cannot be delivered as described, the payment is refunded.",
          "Refunds are processed to the bank details you verified during KYC.",
          "Every refund is logged in your transaction history and in our audit trail.",
        ],
      },
      {
        heading: "For agents",
        body: "Escrow protects you too. Once a buyer's payment is secured, you know the funds exist before you commit your time, documents or inspection schedule. Commission is deducted transparently and your balance appears in your wallet, ready for withdrawal.",
      },
    ]}
  />
);

export default EscrowProtection;
