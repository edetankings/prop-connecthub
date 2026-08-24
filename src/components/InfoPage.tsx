import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export interface InfoSection {
  heading: string;
  body?: string;
  bullets?: string[];
}

interface InfoPageProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  path: string;
  eyebrow?: string;
  intro: string;
  sections: InfoSection[];
  ctaLabel?: string;
  ctaTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}

const InfoPage = ({
  title,
  metaTitle,
  metaDescription,
  path,
  eyebrow = "Trust & Safety",
  intro,
  sections,
  ctaLabel = "Browse verified properties",
  ctaTo = "/properties",
  secondaryLabel = "Talk to a verified agent",
  secondaryTo = "/agents",
}: InfoPageProps) => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={`https://prop-connecthub.lovable.app${path}`} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://prop-connecthub.lovable.app${path}`} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <Navbar />

    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-primary-foreground/70 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <p className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-secondary">
          <ShieldCheck className="h-3.5 w-3.5" /> {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 md:text-base">{intro}</p>
      </div>
    </header>

    <main className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.heading} className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-7">
            <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">{s.heading}</h2>
            {s.body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{s.body}</p>}
            {s.bullets && (
              <ul className="mt-4 space-y-2.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/50 p-6 text-center sm:p-10">
        <h2 className="font-display text-2xl font-semibold text-foreground">Ready to move with confidence?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Every listing on Prop Connect is reviewed, every agent is KYC-verified, and every payment is held securely
          until you confirm.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={ctaTo}>
            <Button className="w-full gap-2 sm:w-auto">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={secondaryTo}>
            <Button variant="outline" className="w-full sm:w-auto">
              {secondaryLabel}
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/trust/safety-center" className="hover:text-foreground">Safety Center</Link>
          <Link to="/trust/escrow-protection" className="hover:text-foreground">Escrow Protection</Link>
          <Link to="/trust/agent-verification" className="hover:text-foreground">Agent Verification</Link>
          <Link to="/trust/property-verification" className="hover:text-foreground">Property Verification</Link>
          <Link to="/trust/fraud-prevention" className="hover:text-foreground">Fraud Prevention</Link>
          <Link to="/trust/code-of-conduct" className="hover:text-foreground">Code of Conduct</Link>
        </div>
      </div>
    </main>

    <Footer />
  </div>
);

export default InfoPage;
