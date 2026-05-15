import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Shield, ChevronDown, MapPin, Bed, Bath, ArrowRight,
  Sparkles, Lock, BadgeCheck, Building2, Users, TrendingUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CinematicFAQ from "@/components/CinematicFAQ";
import AgentCard from "@/components/AgentCard";
import type { DBProperty } from "@/components/DBPropertyCard";
import type { DBAgent } from "@/pages/Agents";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/cinematic-hero.jpg";
import cine2 from "@/assets/cinematic-2.jpg";
import cine3 from "@/assets/cinematic-3.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
} as const;

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={fadeUp}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const CinematicCard = ({ p, index }: { p: DBProperty; index: number }) => {
  const img = p.image_url || p.images?.[0] || cine2;
  const loc = [p.city, p.state].filter(Boolean).join(", ") || "Nigeria";
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: (index % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/property/${p.id}`} className="group relative block overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="relative aspect-[4/5] overflow-hidden">
          <motion.img
            src={img}
            alt={p.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2">
            {p.is_verified && (
              <Badge className="bg-secondary text-secondary-foreground gap-1 backdrop-blur"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
            )}
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur-md">
              {p.status === "for_rent" ? "For Rent" : "For Sale"}
            </Badge>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.2em] opacity-70 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {loc}
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold leading-tight line-clamp-2">{p.title}</h3>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-60">From</p>
                <p className="font-display text-2xl font-bold">₦{p.price?.toLocaleString()}</p>
              </div>
              <div className="flex gap-3 text-xs opacity-90">
                {(p.bedrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>}
                {(p.bathrooms ?? 0) > 0 && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 -translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
              <span>Discover home</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<DBAgent[]>([]);
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [search, setSearch] = useState({ location: "", type: "any", price: "any" });

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  useEffect(() => {
    supabase.from("properties").select("*")
      .in("status", ["available", "for_sale", "for_rent"])
      .order("created_at", { ascending: false }).limit(6)
      .then(({ data }) => setProperties((data as DBProperty[]) || []));
    supabase.from("profiles").select("*")
      .eq("profile_type", "agent").eq("is_visible", true)
      .order("trust_score", { ascending: false }).limit(3)
      .then(({ data }) => setAgents((data as DBAgent[]) || []));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.location) params.set("q", search.location);
    if (search.type !== "any") params.set("type", search.type);
    if (search.price !== "any") params.set("price", search.price);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      {/* HERO */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 will-change-transform">
          <img src={heroImg} alt="Luxury estate" className="h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-widest uppercase backdrop-blur-md"
          >
            <Sparkles className="h-3 w-3 text-secondary" /> Nigeria's Premium Property Experience
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-5xl font-display text-[clamp(2.4rem,7vw,5.5rem)] font-semibold leading-[1.05] tracking-tight"
          >
            Find Your Next Home in a{" "}
            <span className="italic text-gradient-gold">More Beautiful</span> Way
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-5 max-w-xl text-base text-white/75 md:text-lg"
          >
            Verified estates. Trusted agents. Cinematic discovery — escrow-protected from search to keys.
          </motion.p>

          {/* Search */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-10 w-full max-w-4xl rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-2xl shadow-2xl"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                <Input
                  value={search.location}
                  onChange={(e) => setSearch({ ...search, location: e.target.value })}
                  placeholder="City or area"
                  className="h-12 border-0 bg-white/5 pl-10 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                />
              </div>
              <select
                value={search.type}
                onChange={(e) => setSearch({ ...search, type: e.target.value })}
                className="h-12 rounded-md border-0 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="any" className="text-foreground">Any type</option>
                <option value="house" className="text-foreground">House</option>
                <option value="apartment" className="text-foreground">Apartment</option>
                <option value="land" className="text-foreground">Land</option>
                <option value="commercial" className="text-foreground">Commercial</option>
              </select>
              <select
                value={search.price}
                onChange={(e) => setSearch({ ...search, price: e.target.value })}
                className="h-12 rounded-md border-0 bg-white/5 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="any" className="text-foreground">Any price</option>
                <option value="0-5000000" className="text-foreground">Under ₦5M</option>
                <option value="5000000-20000000" className="text-foreground">₦5M – ₦20M</option>
                <option value="20000000-100000000" className="text-foreground">₦20M – ₦100M</option>
                <option value="100000000-" className="text-foreground">₦100M+</option>
              </select>
              <Button type="submit" size="lg" className="h-12 gap-2 bg-secondary px-6 text-secondary-foreground hover:bg-secondary/90">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60"
          >
            Scroll
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* MARQUEE TRUST STRIP */}
      <section className="border-y border-border bg-card/50 py-5 overflow-hidden">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-secondary" /> Escrow Protected</span>
          <span className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-secondary" /> Verified Listings</span>
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-secondary" /> NDPR Compliant</span>
          <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-secondary" /> Government Aligned</span>
        </div>
      </section>

      {/* DISCOVERY */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="mb-14 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">— Discover</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight md:text-6xl">
              Curated homes,<br />cinematically presented.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link to="/properties">
              <Button variant="ghost" className="group gap-2 text-foreground">
                Explore all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </Reveal>
        </div>

        {properties.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p, i) => <CinematicCard key={p.id} p={p} index={i} />)}
          </div>
        ) : (
          <p className="py-16 text-center text-muted-foreground">No properties yet. Check back soon.</p>
        )}
      </section>

      {/* CINEMATIC SPLIT IMAGE */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="grid items-stretch md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto md:min-h-[600px]">
            <motion.img
              src={cine3}
              alt="Waterfront luxury"
              loading="lazy"
              initial={{ scale: 1.1 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-20 md:px-16">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">— Why PROP-connect</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
                A more beautiful way<br />to own property.
              </h2>
              <p className="mt-6 max-w-md text-base text-background/70 leading-relaxed">
                We blend cinematic discovery with rigorous verification — every listing is authenticated, every agent vetted, every payment held in escrow until you say yes.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {[
                  { icon: BadgeCheck, t: "Verified Listings", d: "Documents and titles authenticated against government records." },
                  { icon: Shield, t: "Trusted Agents", d: "10-step KYC. Trust scores keep agents accountable." },
                  { icon: Lock, t: "Escrow Payments", d: "Funds released only when conditions are met." },
                  { icon: Sparkles, t: "Fast Matching", d: "Cinematic discovery, intelligently filtered to you." },
                ].map((f, i) => (
                  <Reveal key={f.t} delay={i * 0.1}>
                    <div className="group">
                      <f.icon className="h-5 w-5 text-secondary" />
                      <h3 className="mt-3 font-display text-base font-semibold">{f.t}</h3>
                      <p className="mt-1 text-sm text-background/60 leading-relaxed">{f.d}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="mb-14 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">— Featured Agents</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
              Meet the people<br />behind the keys.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link to="/agents">
              <Button variant="ghost" className="group gap-2">
                Browse agents <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </Reveal>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.1}>
              <AgentCard agent={a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-card border-y border-border py-20">
        <div className="container mx-auto grid grid-cols-2 gap-y-10 px-4 md:grid-cols-4">
          {[
            { v: "12K+", l: "Verified Buyers", icon: Users },
            { v: "850+", l: "Trusted Agents", icon: BadgeCheck },
            { v: "₦18B", l: "Secured in Escrow", icon: Shield },
            { v: "98%", l: "Success Rate", icon: TrendingUp },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08} className="text-center">
              <s.icon className="mx-auto mb-3 h-5 w-5 text-secondary" />
              <p className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{s.v}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={cine2} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-black/85" />
        </div>
        <div className="relative container mx-auto px-4 py-28 text-center text-primary-foreground md:py-40">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
              Your next chapter,<br />beautifully secured.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-primary-foreground/80">
              Start your search now — or list your property to thousands of verified buyers.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/properties">
                <Button size="lg" className="h-12 gap-2 bg-secondary px-8 text-secondary-foreground hover:bg-secondary/90">
                  Browse Properties <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="h-12 border-white/40 bg-white/10 px-8 text-white backdrop-blur hover:bg-white/20">
                  Become an Agent
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
