import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Shield, TrendingUp, Users, CheckCircle, PlayCircle, ChevronDown, ChevronUp, Building2, FileCheck, MapPin, Lock, BarChart3 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import AgentCard from "@/components/AgentCard";
import { properties, platformStats } from "@/lib/mockData";
import type { DBAgent } from "@/pages/Agents";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";
import { useState, useEffect } from "react";

const stats = [
  { label: "Total Users", value: platformStats.totalUsers.toLocaleString(), icon: Users },
  { label: "Verified Agents", value: platformStats.verifiedAgents.toString(), icon: Shield },
  { label: "Completed Deals", value: platformStats.completedTransactions.toLocaleString(), icon: TrendingUp },
  { label: "Escrow Success", value: `${platformStats.escrowSuccessRate}%`, icon: Shield },
];

const govPartners = [
  "Licensed Surveyors",
  "Property Lawyers",
  "Estate Surveyors & Valuers",
  "Registered Real Estate Companies",
  "State Land Registries",
  "Ministry of Lands & Housing",
];

const howItWorks = [
  { step: "1", icon: Search, title: "Search Properties", desc: "Browse verified land and houses for rent or purchase across Nigeria." },
  { step: "2", icon: FileCheck, title: "Verify Documents", desc: "Upload land documents for authentication through licensed professionals and government records." },
  { step: "3", icon: MapPin, title: "GPS & Survey Matching", desc: "We match survey plans with GPS coordinates to confirm exact land positioning and prevent double sales." },
  { step: "4", icon: Lock, title: "Secure Escrow Payment", desc: "Make payments securely through our protected escrow system. Funds are only released when conditions are met." },
  { step: "5", icon: BarChart3, title: "Complete with Confidence", desc: "All transactions are recorded, transparent, and traceable." },
];

const faqs = [
  { q: "How do I know a property is genuine?", a: "Every property goes through document verification and professional validation before approval." },
  { q: "Does PROP-connect work with government agencies?", a: "Yes. We align with state land registries and licensed professionals for document confirmation." },
  { q: "How does escrow payment work?", a: "Funds are held securely and only released after verification conditions are satisfied." },
  { q: "Can I buy from outside Nigeria?", a: "Yes. PROP-connect supports diaspora Nigerians with remote verification and secure transactions." },
  { q: "What happens if a transaction fails?", a: "Our reverse payment policy ensures refunds according to agreed terms and conditions." },
];

const testimonialRoles = [
  { role: "Buyer", story: "Avoided double sales on a Lagos property. The GPS matching saved me ₦15M." },
  { role: "Diaspora Nigerian", story: "Purchased land remotely from the UK with full confidence in every step." },
  { role: "Developer", story: "Gained verified exposure for my estate — sold 12 units in 3 months." },
  { role: "Agent", story: "Built trust with clients through transparency. My trust score is now 98%." },
];

const FAQ = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="font-medium text-foreground">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
};

const Index = () => {
  const [agents, setAgents] = useState<DBAgent[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("profile_type", "agent")
      .eq("is_visible", true)
      .order("trust_score", { ascending: false })
      .limit(2)
      .then(({ data }) => setAgents((data as DBAgent[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero opacity-85" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
              Find & Secure Properties <span className="text-gradient-gold">With Trust</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 md:text-xl">
              Nigeria's most secure property marketplace — escrow-powered, trust-scored, and fully verified agents.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/properties">
                <Button size="lg" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 sm:w-auto">
                  <Search className="h-5 w-5" /> Browse Properties
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                  Become an Agent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="-mt-8 relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4 shadow-card animate-count-up" style={{ animationDelay: `${i * 100}ms` }}>
              <stat.icon className="mb-2 h-5 w-5 text-secondary" />
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Government Partners */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-7 w-7 text-secondary" />
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Trusted by Government Agencies & Industry Bodies</h2>
          </div>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            PROP-connect works in partnership with licensed professionals and regulatory bodies, ensuring every property listed is verified, traceable, and legally compliant.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {govPartners.map((partner) => (
              <div key={partner} className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-secondary" />
                <span className="text-sm font-medium text-foreground">{partner}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Our system follows official land registry procedures and complies with Nigeria Data Protection Regulation (NDPR), ensuring transparency, security, and government-aligned verification processes.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">How PROP-connect Works</h2>
            <p className="mt-2 text-muted-foreground">A simple, secure process to protect your property investment</p>
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            {howItWorks.map((step, i) => (
              <div key={step.step} className="relative flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero shadow-elevated">
                  <step.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {step.step}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Featured Properties</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked by verified agents</p>
          </div>
          <Link to="/properties">
            <Button variant="ghost" className="text-secondary hover:text-secondary/80">View All →</Button>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.slice(0, 3).map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* Video / Verification CTA */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">See How Verification Works</h2>
              <p className="mt-3 text-muted-foreground">Watch our 2-minute explainer to understand how PROP-connect protects your property investment from fraud, fake documents, and double sales.</p>
              <ul className="mt-4 space-y-2">
                {[
                  "Document authentication with government records",
                  "GPS coordinate matching with survey plans",
                  "Agent verification and background checks",
                  "Secure escrow payment protection",
                  "Title status confirmation (C of O, Gazette, Excision, Freehold)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <Link to="/register">
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">👉 Get Started Free</Button>
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-hero aspect-video flex items-center justify-center shadow-elevated">
              <div className="text-center text-primary-foreground">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/40">
                  <PlayCircle className="h-10 w-10 text-secondary" />
                </div>
                <p className="font-display font-semibold text-lg">Watch Explainer</p>
                <p className="text-sm text-primary-foreground/70">2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Agents */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Trusted Agents</h2>
              <p className="mt-1 text-muted-foreground">Verified professionals you can count on</p>
            </div>
            <Link to="/agents">
              <Button variant="ghost" className="text-secondary hover:text-secondary/80">View All →</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {agents.slice(0, 2).map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Frequently Asked Questions</h2>
            <p className="mt-2 text-muted-foreground">Everything you need to know about buying property safely in Nigeria</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            {faqs.map((faq) => (
              <FAQ key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5 mb-3">
              <span className="text-sm font-medium text-secondary">🇳🇬 Trusted Nationwide</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Real Stories from Nigerians</h2>
            <p className="mt-2 text-muted-foreground">People who secured their property investments safely with PROP-connect</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {testimonialRoles.map((t) => (
              <div key={t.role} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.story}"</p>
                <p className="mt-3 text-xs font-semibold text-secondary">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl bg-gradient-hero p-8 text-center md:p-16">
          <Shield className="mx-auto mb-4 h-12 w-12 text-secondary" />
          <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Your Security Is Our Priority</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Every transaction is protected by our escrow system. Every agent is verified through a 10-step KYC process. Your money is safe with Prop Connect.
          </p>
          <Link to="/register">
            <Button size="lg" className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90">Get Started Free</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
