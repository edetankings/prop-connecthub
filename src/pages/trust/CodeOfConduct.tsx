import InfoPage from "@/components/InfoPage";

const CodeOfConduct = () => (
  <InfoPage
    path="/trust/code-of-conduct"
    title="Community Code of Conduct"
    metaTitle="Community Code of Conduct | Prop Connect Nigeria"
    metaDescription="The standards every buyer, renter, agent and builder agrees to on Prop Connect — honest listings, respectful communication and on-platform payments."
    intro="Prop Connect works because people behave well. These are the standards every member of the community agrees to."
    secondaryLabel="Read our Terms of Use"
    secondaryTo="/terms"
    sections={[
      {
        heading: "For everyone",
        bullets: [
          "Provide accurate information about yourself and keep your profile up to date.",
          "Communicate respectfully. Harassment, threats, hate speech and discrimination are not tolerated.",
          "Keep negotiations and payments on the platform so both sides stay protected.",
          "Do not create multiple accounts or impersonate another person or business.",
        ],
      },
      {
        heading: "For agents and builders",
        bullets: [
          "List only properties you are genuinely authorised to market.",
          "Use your own photos and videos of the actual property.",
          "State the true price, size and availability — no bait listings.",
          "Update or close a listing as soon as it is sold, rented or withdrawn.",
          "Never request payment outside Prop Connect's secure payment flow.",
        ],
      },
      {
        heading: "For buyers and renters",
        bullets: [
          "Only request deals on properties you genuinely intend to pursue.",
          "Attend agreed inspections or give reasonable notice if plans change.",
          "Do not pressure agents to bypass verification or escrow.",
          "Report inaccurate listings so the community stays clean.",
        ],
      },
      {
        heading: "Prohibited conduct",
        bullets: [
          "Fraud, forged documents or misrepresenting ownership.",
          "Sharing contact details in chat to move a deal off-platform.",
          "Money laundering or any attempt to disguise the source of funds.",
          "Scraping, reselling or misusing other members' personal data.",
        ],
      },
      {
        heading: "Enforcement",
        body: "Breaches are handled proportionately: a warning, loss of a verified badge, suspension of listing privileges, withheld payouts, or permanent removal from the platform. Serious cases are escalated to law enforcement. Every enforcement action is logged and can be appealed by contacting propconnect0@gmail.com.",
      },
    ]}
  />
);

export default CodeOfConduct;
