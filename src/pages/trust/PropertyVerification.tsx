import InfoPage from "@/components/InfoPage";

const PropertyVerification = () => (
  <InfoPage
    path="/trust/property-verification"
    title="Property Verification & Listing Review"
    metaTitle="Property Verification & Listing Review | Prop Connect Nigeria"
    metaDescription="How Prop Connect reviews every property listing before it goes live: document checks, location validation, property codes and verified badges."
    intro="No listing appears publicly on Prop Connect until it has been reviewed. Each approved property receives a unique property code you can quote in any conversation or dispute."
    sections={[
      {
        heading: "Every listing is reviewed before it goes live",
        bullets: [
          "New listings are submitted as pending and are queued for admin review.",
          "Our team checks the title or ownership documents uploaded by the agent.",
          "Photos and videos are checked for accuracy and for signs of being copied from other sites.",
          "Location, state and map coordinates are validated against the stated address.",
          "Only approved listings are published to the public property feed.",
        ],
      },
      {
        heading: "Property codes",
        body: "Each approved property is issued a Prop Connect property code in the format PROP-STATE-AGENT-NUMBER (for example PROP-LAG-AGT-0001). Quote this code in messages, payments and disputes so the exact unit is never in doubt.",
      },
      {
        heading: "Documents we look for",
        bullets: [
          "Certificate of Occupancy (C of O) or Governor's Consent.",
          "Deed of Assignment or registered conveyance.",
          "Approved survey plan.",
          "For rentals: proof of the landlord's authority to let the property.",
        ],
      },
      {
        heading: "Listing statuses you may see",
        bullets: [
          "Available / For Sale / For Rent — approved and open to the public.",
          "Under Verification — submitted and awaiting review; not publicly listed.",
          "Payment Pending or Transaction In Progress — a buyer has an active secure transaction on the unit.",
          "Sold or Rented — the deal has completed and the listing is closed.",
        ],
      },
      {
        heading: "Found something inaccurate?",
        body: "If a listing's photos, price, size or availability do not match reality, report it from the property page or email propconnect0@gmail.com with the property code. Listings found to be misleading are removed and the agent's account is reviewed.",
      },
    ]}
  />
);

export default PropertyVerification;
