import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const URL = "https://prop-connecthub.lovable.app/guides/investing-in-nigeria";

const InvestingInNigeria = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>How to Invest in Real Estate in Nigeria — Prop Connect</title>
        <meta
          name="description"
          content="A practical guide to investing in Nigerian real estate: property types, the Land Use Act, due diligence, and ROI in Lagos, Abuja, and Port Harcourt."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={URL} />
        <meta property="og:title" content="How to Invest in Real Estate in Nigeria — Prop Connect" />
        <meta
          property="og:description"
          content="Property types, the Land Use Act, due diligence, and ROI expectations in major Nigerian cities."
        />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Invest in Real Estate in Nigeria",
          author: { "@type": "Organization", name: "Prop Connect" },
          publisher: { "@type": "Organization", name: "Prop Connect" },
          mainEntityOfPage: URL,
        })}</script>
      </Helmet>

      <Navbar />

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <article className="prose prose-slate max-w-none dark:prose-invert">
          <h1 className="text-4xl font-bold tracking-tight">How to Invest in Real Estate in Nigeria</h1>
          <p className="text-muted-foreground">
            A practical, no-fluff guide for buyers, diaspora investors, and first-time landlords
            looking to put capital into Nigerian property safely.
          </p>

          <h2>Why Nigerian real estate?</h2>
          <p>
            Nigeria's population — projected past 230 million — creates structural demand for
            housing in Lagos, Abuja, Port Harcourt, and emerging secondary cities like Ibadan
            and Uyo. Real estate hedges naira inflation, generates rental income in dollars in
            select estates, and offers long-term capital appreciation when title is clean.
          </p>

          <h2>Property types to consider</h2>
          <ul>
            <li><strong>Land (raw or surveyed)</strong> — Highest appreciation in growth corridors (Lekki–Epe, Abuja satellite towns). Lowest cash flow.</li>
            <li><strong>Off-plan apartments</strong> — Lower entry price, payment plans, but developer and delivery risk.</li>
            <li><strong>Completed residential</strong> — Immediate rental yield, typically 4–8% gross in Lagos mainland, 6–10% in Abuja suburbs.</li>
            <li><strong>Shortlets / serviced apartments</strong> — 12–20% gross yields in prime Lagos / Abuja zones, higher operating cost.</li>
            <li><strong>Commercial & warehousing</strong> — Industrial corridors (Ogun, Lekki Free Zone) offer long leases to corporates.</li>
          </ul>

          <h2>Legal foundation: the Land Use Act</h2>
          <p>
            The Land Use Act of 1978 vests all land in each state in the Governor, who holds it
            in trust. What you actually buy is a <strong>right of occupancy</strong>, evidenced
            by a Certificate of Occupancy (C of O) or, for excised lands, a Governor's Consent
            on assignment. Key documents to insist on:
          </p>
          <ul>
            <li>Certificate of Occupancy (C of O) — primary title from the state.</li>
            <li>Governor's Consent — required for any transfer of a registered title.</li>
            <li>Deed of Assignment — between you and the seller.</li>
            <li>Survey Plan — registered at the Surveyor-General's office.</li>
            <li>Excision / Gazette — for land originally under communal ownership.</li>
          </ul>
          <p>
            Avoid land marked for government acquisition unless an excision has been gazetted.
            Always run a search at the state Lands Registry before paying.
          </p>

          <h2>Due diligence checklist</h2>
          <ol>
            <li>Verify the seller's identity and chain of title at the Lands Registry.</li>
            <li>Confirm the survey coordinates against the master plan to rule out government acquisition.</li>
            <li>Engage an independent property lawyer — never the seller's lawyer alone.</li>
            <li>Visit the site physically; speak to neighbours and the community Baale or CDA.</li>
            <li>Pay through traceable bank channels — never cash. Use escrow where available.</li>
          </ol>

          <h2>ROI expectations in major cities</h2>
          <ul>
            <li><strong>Lagos (Lekki Phase 1, Ikoyi, Victoria Island)</strong> — Capital appreciation 8–15% p.a.; rental yields 4–7% gross.</li>
            <li><strong>Lagos (Ajah, Sangotedo, Ibeju-Lekki)</strong> — Land appreciation 15–30% p.a. in active corridors; yields lower.</li>
            <li><strong>Abuja (Maitama, Asokoro, Wuse 2)</strong> — Yields 6–9%, strong diplomatic / corporate tenant base.</li>
            <li><strong>Port Harcourt (GRA, Trans Amadi)</strong> — Yields 7–10%; tenant base tied to oil & gas cycle.</li>
            <li><strong>Ibadan, Uyo, Asaba</strong> — Lower entry, 10–18% land appreciation as infrastructure expands.</li>
          </ul>

          <h2>How Prop Connect helps</h2>
          <p>
            Every property on Prop Connect is reviewed by our admin team before going live, and
            agents complete KYC verification before they can list. Reservations and payments
            flow through an escrow workflow so funds are only released once milestones are met.
          </p>
          <p>
            Ready to start? <Link to="/properties" className="text-primary underline">Browse verified listings</Link>{" "}
            or <Link to="/agents" className="text-primary underline">find a verified agent</Link>.
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default InvestingInNigeria;
