import { siteUrl } from "@/lib/seo";
import { Link } from "react-router-dom";
import MarketplaceFlow, { PropertyCategories } from "@/components/home/MarketplaceFlow";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import HomeMotion from "@/components/home/HomeMotion";
import PropertySearch from "@/components/home/PropertySearch";
import { PageContainer, ListingSkeleton } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import {
  Shield, ArrowUpRight, LockKeyhole, BadgeCheck, Building2, Users,
  Search, Heart, MessageCircle, CalendarCheck, ClipboardList, FileCheck2, Eye, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCarousel from "@/components/PropertyCarousel";
import AgentCard from "@/components/AgentCard";
import type { DBProperty } from "@/components/DBPropertyCard";
import type { DBAgent } from "@/pages/Agents";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/architecture-forest-v2.jpg";
import cine3 from "@/assets/cinematic-3.jpg";

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div data-section-reveal className="home-section-intro"><p className="text-eyebrow">{eyebrow}</p><h2 className="home-section-heading">{title}</h2>{description && <p>{description}</p>}</div>;
}

const Index = () => {
  const [agents, setAgents] = useState<(DBAgent & { profession: string })[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState(false);
  const [agentRetry, setAgentRetry] = useState(0);
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState(false);
  const [propertyRetry, setPropertyRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setAgentsLoading(true);
    setAgentsError(false);
    const loadAgents = async () => {
      try {
        const { data, error } = await supabase.from("public_profiles").select("*")
          .eq("profile_type", "agent").eq("kyc_verified", true).order("trust_score", { ascending: false }).limit(3);
        if (error) throw error;
        if (active) setAgents((data || []).filter(row => row.id !== null).map(row => ({
          profession: row.profile_type === "builder" ? "Builder" : "Agent", id: row.id!, full_name: row.full_name || "Property professional", avatar_url: row.avatar_url,
          trust_score: row.trust_score ?? 0, kyc_verified: row.kyc_verified ?? false,
          location: row.location, bio: row.bio, properties_listed: row.properties_listed ?? 0,
          completed_transactions: row.completed_transactions ?? 0, is_visible: row.is_visible ?? false,
        })));
      } catch { if (active) setAgentsError(true); }
      finally { if (active) setAgentsLoading(false); }
    };
    void loadAgents();
    return () => { active = false; };
  }, [agentRetry]);


  useEffect(() => {
    let active = true;
    setPropertiesLoading(true);
    setPropertiesError(false);
    setProperties([]);
    const load = async () => {
      try {
        const { data, error } = await supabase.from("properties").select("*")
          .eq("is_verified", true).in("status", ["available", "for_sale", "for_rent"])
          .order("created_at", { ascending: false }).limit(12);
        if (error) throw error;
        if (active) setProperties((data as DBProperty[]) || []);
      } catch {
        if (active) setPropertiesError(true);
      } finally {
        if (active) setPropertiesLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [propertyRetry]);

  const estates = properties.filter(property => property.property_type.toLowerCase() === "estate");
  const estateImage = estates[0]?.image_url || estates[0]?.images?.[0];

  return (
    <HomeMotion><div className="home-redesign min-h-screen bg-background">
      <Helmet>
        <title>Prop Connect - Find Your Place. Move With Confidence.</title>
        <meta name="description" content="Prop Connect is a digital platform designed to help Nigerians safely search, verify, and acquire genuine landed properties from trusted, KYC-verified agents." />
        <link rel="canonical" href={siteUrl("/")} />
        <meta property="og:url" content={siteUrl("/")} />
        <meta property="og:title" content="Prop Connect - Find Your Place. Move With Confidence." />
        <meta property="og:description" content="Search, verify, and acquire genuine landed properties from trusted, KYC-verified agents across Nigeria." />
      </Helmet>
      <Navbar overlay />

      <main id="main-content" tabIndex={-1}>
      <section data-home-section="hero" className="premium-hero relative isolate overflow-hidden" aria-labelledby="hero-title">
        <div className="premium-hero-overlay" />
        <PageContainer className="hero-content">
          <div className="hero-editorial">
            <div data-hero-reveal className="hero-category-links"><Link to="/properties?type=house">Homes</Link><Link to="/properties?type=apartment">Apartments</Link><Link to="/properties?type=land">Land</Link></div>
            <h1 id="hero-title" data-hero-reveal className="hero-headline">Find your place.<br /><strong>Move with confidence.</strong></h1>
            <p data-hero-reveal className="hero-description">A home for your next chapter. Explore properties across Nigeria, connect with property professionals and find a place that feels like you.</p>
          </div>
          <div className="hero-visual"><img src={heroImg} alt="Architectural concept: a contemporary home within tropical woodland" data-architecture-reveal {...{ fetchpriority: "high" }} width={1672} height={941} /></div>
          <div data-hero-reveal className="hero-search-wrap"><PropertySearch /></div>
          <p className="mt-4 text-right text-[11px] text-white/70">Architectural inspiration · Explore current availability below</p>
        </PageContainer>
      </section>
      <PropertyCategories />

      <section id="discover" data-home-section="featured" className="page-container home-section featured-discovery" aria-labelledby="featured-title">
        <div className="home-section-top"><div data-section-reveal className="home-section-intro"><p className="text-eyebrow">Selected for your next chapter</p><h2 id="featured-title" className="home-section-heading">A place to call your own.</h2><p>Discover the latest reviewed listings. Find the home, space or fresh start that fits your life.</p></div><Button asChild variant="outline"><Link to="/properties">View all properties <ArrowUpRight /></Link></Button></div>
        {propertiesLoading ? <ListingSkeleton /> : propertiesError ? <div role="alert" className="home-empty"><Building2 /><h3>We couldn't load the listings.</h3><p>Your next place is worth another look.</p><Button onClick={() => setPropertyRetry(n => n + 1)}>Try again</Button></div> : properties.length ? <PropertyCarousel properties={properties} responsiveGrid /> : <div className="home-empty"><Building2 /><h3>A little room for possibility.</h3><p>No reviewed listings to show yet. Come back soon or explore the property search.</p><Button asChild variant="outline"><Link to="/properties">Explore properties <ArrowUpRight /></Link></Button></div>}
      </section>

      <section data-home-section="locations" className="home-location-section home-section">
        <PageContainer><div className="home-section-top"><SectionHeading eyebrow="Somewhere that feels like you" title="Different cities. New possibilities." description="Explore locations across Nigeria. Current availability is shown in your search results." /><span className="home-editorial-note">Four places to start your search</span></div>
        <div className="home-city-grid">{[{city:"Lagos",region:"Lagos State"},{city:"Abuja",region:"Federal Capital Territory"},{city:"Port Harcourt",region:"Rivers State"},{city:"Ibadan",region:"Oyo State"}].map((item,i)=><Link data-section-reveal key={item.city} to={`/properties?q=${encodeURIComponent(item.city)}`} className="home-city-card"><span className="home-city-index">0{i+1}</span><div><span>{item.region}</span><h3>{item.city}</h3><p>Explore properties <ArrowUpRight /></p></div></Link>)}</div></PageContainer>
      </section>

      <MarketplaceFlow />

      <section data-home-section="trust" className="home-trust home-section">
        <PageContainer className="home-trust-layout"><div data-section-reveal><p className="text-eyebrow">Confidence comes from clarity</p><h2 className="home-section-heading">A considered approach.<br />At every step.</h2><p className="home-body-copy">A verification badge is a useful starting point, not a guarantee. Inspect the property, check ownership documents and seek independent legal advice before committing.</p><Button asChild variant="outline"><Link to="/trust/safety-center">Visit our safety centre <ArrowUpRight /></Link></Button><aside className="home-trust-principle"><Shield /><p>Verification is a starting point.<br /><strong>Clarity comes from asking questions.</strong></p><span>Inspect. Verify documents. Seek independent advice.</span></aside></div>
        <div className="home-trust-list">{[{icon:BadgeCheck,title:"Professional verification",text:"Review the verification status on a professional's profile.",to:"/trust/agent-verification"},{icon:FileCheck2,title:"Property review",text:"Listings pass through platform review. Confirm titles independently.",to:"/trust/property-verification"},{icon:LockKeyhole,title:"Protected document access",text:"Sensitive uploads are subject to access permissions. Share only what is needed.",to:"/privacy"},{icon:Eye,title:"Transaction visibility",text:"Follow enquiries and deal updates in your account. Financial operations remain locked.",to:"/dashboard"},{icon:Shield,title:"Marketplace moderation",text:"Read our conduct standards and contact support about concerns.",to:"/trust/code-of-conduct"}].map((item,i)=><Link data-section-reveal className="home-trust-item" key={item.title} to={item.to}><item.icon aria-hidden="true" /><div><span className="home-step-index">0{i+1}</span><h3>{item.title}</h3><p>{item.text}</p></div><ArrowUpRight className="home-trust-arrow" /></Link>)}</div></PageContainer>
      </section>

      <section data-home-section="professionals" className="page-container home-section">
        <div className="home-section-top"><SectionHeading eyebrow="The people behind the places" title="Good connections start here." description="Meet verified property professionals. Read their profiles, ask questions and arrange your next conversation." /><Button asChild variant="outline"><Link to="/agents">Meet the professionals <ArrowUpRight /></Link></Button></div>
        {agentsLoading ? <p role="status" className="home-empty">Loading property professionals...</p> : agentsError ? <div role="alert" className="home-empty"><Users /><h3>We couldn't load the professionals.</h3><p>Please try again.</p><Button onClick={() => setAgentRetry(n=>n+1)}>Retry professionals</Button></div> : agents.length ? <div className="home-professionals-grid">{agents.map(agent=><AgentCard key={agent.id} agent={agent} editorial profession={agent.profession} />)}</div> : <div className="home-professional-empty"><div><Users /><h3>Great connections are on their way.</h3><p>No verified professionals to display yet. Visit the directory or join as a property professional.</p></div><Button asChild variant="outline"><Link to="/agents">Explore the directory <ArrowUpRight /></Link></Button></div>}
      </section>

      <section data-home-section="developments" className="home-developments home-section">
        <PageContainer><div className="home-development-intro"><div className="home-development-photo" data-image-mask>{estateImage ? <img src={estateImage} alt={estates[0].title} loading="lazy" onError={event => { if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg"; }} /> : <div className="home-development-placeholder"><Building2 aria-hidden="true" /><p>Place. Potential.<br />Possibility.</p><span>Estate discovery</span></div>}<span>{estateImage ? "From the latest estate collection" : "Space for your next move"}</span></div><SectionHeading eyebrow="New perspectives on place" title="Space for what comes next." description="Explore estate listings within our latest reviewed collection. Development status, available units and project details must be confirmed with the listing professional." /></div>
        <div className="mt-8">{propertiesLoading ? <p role="status">Loading estate listings...</p> : propertiesError ? <div role="alert" className="home-empty"><h3>Estate listings are temporarily unavailable.</h3><Button onClick={()=>setPropertyRetry(n=>n+1)}>Retry estate listings</Button></div> : estates.length > 0 ? <PropertyCarousel properties={estates} /> : <div className="home-development-empty"><Building2 /><div><h3>A new perspective is taking shape.</h3><p>No estate listings in the latest collection. Explore the full estate search for current availability.</p></div></div>}</div><Button asChild variant="outline" className="mt-6"><Link to="/properties?type=estate">Explore estate listings <ArrowUpRight /></Link></Button></PageContainer>
      </section>

      <section data-home-section="experience" className="page-container home-section">
        <div className="home-experience"><div className="home-experience-photo" data-image-mask><img data-soft-parallax src={cine3} alt="Architectural inspiration for your next home" loading="lazy" /><div><span>A place to begin.</span><p>A little more room<br />to be you.</p></div></div><div><SectionHeading eyebrow="For buyers. For renters. For you." title="Your search, with room to breathe." description="From a saved favourite to a confirmed inspection, keep the important details together." /><ul className="home-experience-list">{[{icon:Search,title:"Search your way",text:"Narrow your search by location, budget and property type.",to:"/properties"},{icon:Heart,title:"Keep your favourites close",text:"Save a listing on this device with the heart button. Local saves stay in this browser.",to:"/#discover"},{icon:MessageCircle,title:"Start a conversation",text:"Sign in to message a property professional.",to:"/messages"},{icon:CalendarCheck,title:"See it for yourself",text:"Request an inspection through an available listing.",to:"/properties"},{icon:ClipboardList,title:"Follow your enquiries",text:"Check messages, inspections and deal updates in your dashboard.",to:"/dashboard"}].map(item=><li data-section-reveal key={item.title}><item.icon /><div><Link to={item.to}><h3>{item.title} <ArrowUpRight /></h3></Link><p>{item.text}</p></div></li>)}</ul></div></div>
      </section>

      <section data-home-section="partnership" className="home-partnership">
        <PageContainer className="home-partnership-layout"><div data-section-reveal><p className="text-eyebrow">Built for property professionals</p><h2 className="home-section-heading">Your expertise.<br />A wider horizon.</h2><p className="home-body-copy">Bring your properties and professional perspective to PROP-CONNECT. Manage listings, respond to enquiries and follow your work in one place.</p><Button asChild><Link to="/register">Become an agent or builder <ArrowUpRight /></Link></Button></div><div className="home-partner-benefits">{[{n:"01",title:"Introduce yourself",text:"Create your account and choose your existing agent or builder onboarding path."},{n:"02",title:"Build your profile",text:"Complete the platform's profile and verification requirements."},{n:"03",title:"Make meaningful connections",text:"Share reviewed listings and keep conversations organised in your dashboard."}].map(item=><div data-section-reveal key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></PageContainer>
      </section>

      <section data-home-section="resources" className="page-container home-section">
        <div className="home-section-top"><SectionHeading eyebrow="A little knowledge. A clearer next step." title="Read before you move." description="Practical guides and safety information to help you make a considered property decision." /><span className="home-editorial-note">Your property reading list</span></div>
        <div className="home-resources">{[{n:"01",title:"Investing in Nigerian property",text:"Understand the considerations before starting your property journey.",to:"/guides/investing-in-nigeria",category:"Property guide"},{n:"02",title:"Know what to verify",text:"Learn about property review and independent document checks.",to:"/trust/property-verification",category:"Due diligence"},{n:"03",title:"A safer search starts with you",text:"Recognise warning signs and read the platform's fraud prevention guidance.",to:"/trust/fraud-prevention",category:"Safety resource"}].map(item=><Link data-section-reveal className="home-resource" key={item.n} to={item.to}><span className="home-resource-number">{item.n}</span><div><p className="text-eyebrow">{item.category}</p><h3>{item.title}</h3><p>{item.text}</p></div><ArrowUpRight /></Link>)}</div>
      </section>

      <section data-home-section="final-cta" className="home-final-cta">
        <PageContainer data-section-reveal><p className="home-cta-eyebrow">Find your place. Move with confidence.</p><h2>Your Next Chapter<br /><span>Starts Here.</span></h2><p className="home-cta-copy">Discover properties across Nigeria, meet the people behind them and find a place for whatever comes next.</p><div className="home-cta-actions"><Button asChild><Link to="/properties">Explore Properties <ArrowUpRight /></Link></Button><Button asChild variant="outline"><Link to="/register">Get Started <ArrowRight /></Link></Button></div><p className="home-cta-footnote">A home for your plans. A little space for possibility.</p></PageContainer>
      </section>
      </main>
      <Footer />
    </div></HomeMotion>
  );
};

export default Index;
