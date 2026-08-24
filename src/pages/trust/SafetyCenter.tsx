import InfoPage from "@/components/InfoPage";

const SafetyCenter = () => (
  <InfoPage
    path="/trust/safety-center"
    title="Prop Connect Safety Center"
    metaTitle="Safety Center — Buy & Rent Property Safely | Prop Connect"
    metaDescription="Practical safety guidance for buyers, renters and agents on Prop Connect: verify listings, inspect safely, pay through escrow and report suspicious activity."
    intro="One place for everything you need to transact safely on Prop Connect — from vetting a listing to inspecting a property and paying without risk."
    sections={[
      {
        heading: "Before you inspect a property",
        bullets: [
          "Confirm the listing shows a Verified badge and a Prop Connect property code (e.g. PROP-LAG-AGT-0001).",
          "Check that the agent's profile is KYC-verified and has a trust score and completed transactions.",
          "Keep all conversation inside Prop Connect Messages so there is a record if a dispute is raised.",
          "Never send an inspection fee, agreement fee or 'commitment fee' to a personal bank account.",
        ],
      },
      {
        heading: "During an inspection",
        bullets: [
          "Inspect during daylight hours and bring someone with you.",
          "Share the property address and your agent's name with a family member or friend before you go.",
          "Ask to see original title documents (C of O, Deed of Assignment, Governor's Consent or survey plan).",
          "Photograph the property and documents so you can attach them to a dispute if needed.",
        ],
      },
      {
        heading: "When it is time to pay",
        body: "Prop Connect payments are held securely until the deal is confirmed. Money only moves to the agent after you and our team confirm the transaction is legitimate.",
        bullets: [
          "Pay only into the company account shown on the Secure Payment checkout page.",
          "Upload your proof of payment inside the platform so the transaction is traceable.",
          "Your payment is only released after verification — never pay off-platform.",
        ],
      },
      {
        heading: "Red flags to walk away from",
        bullets: [
          "Prices far below market value with pressure to 'pay now before someone else does'.",
          "An agent who asks you to move the conversation to WhatsApp or to call a private number.",
          "Requests for payment to an individual's account, cryptocurrency or gift cards.",
          "Refusal to provide documents, a property code, or an in-person inspection.",
        ],
      },
      {
        heading: "Report a problem",
        body: "If something feels wrong, stop and report it. Open a dispute from your transaction, raise a support ticket from Settings, or email propconnect0@gmail.com. Our compliance team reviews every report and can freeze a payment while an investigation runs.",
      },
    ]}
  />
);

export default SafetyCenter;
