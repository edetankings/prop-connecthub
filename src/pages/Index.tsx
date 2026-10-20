import { siteUrl } from "@/lib/seo";
import { Link } from "react-router-dom";
import { PropertyCategories } from "@/components/home/MarketplaceFlow";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import HomeMotion from "@/components/home/HomeMotion";
import PropertySearch from "@/components/home/PropertySearch";
import InspectionShowcase from "@/components/home/InspectionShowcase";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Shield, LockKeyhole, BadgeCheck, Building2, FileCheck2, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCarousel from "@/components/PropertyCarousel";
import type { DBProperty } from "@/components/DBPropertyCard";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/architecture-forest-v2.jpg";
import HomeFaq from "@/components/home/HomeFaq";
import WhyPropConnect from "@/components/home/WhyPropConnect";
import ExperienceCarousel from "@/components/home/ExperienceCarousel";

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div data-section-reveal className="home-section-intro"><p className="text-eyebrow">{eyebrow}</p><h2 className="home-section-heading">{title}</h2>{description && <p>{description}</p>}</div>;
}

const heroCategories = {
  Homes: { title: "A home for your", emphasis: "next chapter.", description: "Explore houses to buy or rent across Nigeria. Compare locations, prices, bedrooms and listing photographs, then connect with the listing professional to ask questions or request an inspection." },
  Apartments: { title: "Your own space.", emphasis: "Your kind of living.", description: "Discover apartments that suit your location, budget and everyday routine. Review the rooms and listed amenities, ask the professional about building facilities and charges, and arrange an inspection before deciding." },
  Land: { title: "Room for your", emphasis: "next big idea.", description: "Explore land listings and compare their location, advertised plot size, price and available information. Ask the listing professional about the site and supporting documents, and request a visit to understand the space." },
};

const Index = () => {
  const [heroCategory, setHeroCategory] = useState<keyof typeof heroCategories | null>(null);
  const heroDetail = heroCategory ? heroCategories[heroCategory] : null;
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState(false);
  const [propertyRetry, setPropertyRetry] = useState(0);




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
            <div data-hero-reveal className="hero-category-links" role="group" aria-label="Explore property categories">{(Object.keys(heroCategories) as (keyof typeof heroCategories)[]).map(category => <button key={category} type="button" aria-pressed={(heroCategory || "Homes") === category} aria-controls="hero-category-explanation" onClick={() => setHeroCategory(category)}>{category}</button>)}</div>
            <div id="hero-category-explanation" aria-live="polite" aria-atomic="true">
              <div key={heroCategory || "intro"} className={heroCategory ? "hero-category-transition" : undefined}>
              <h1 id="hero-title" data-hero-reveal className="hero-headline">{heroDetail ? <>{heroDetail.title}<br /><strong>{heroDetail.emphasis}</strong></> : <>Find your place.<br /><strong>Move with confidence.</strong></>}</h1>
              <p data-hero-reveal className="hero-description">{heroDetail?.description || "A home for your next chapter. Explore properties across Nigeria, connect with property professionals and find a place that feels like you."}</p>
              </div>
            </div>
          </div>
          <div className="hero-visual" data-architecture-reveal>{[{category:"Homes",src:heroImg,alt:"Architectural concept: a contemporary home within tropical woodland"},{category:"Apartments",src:"/images/categories/apartments.jpg",alt:"Apartment building with balconies"},{category:"Land",src:"/images/categories/land.jpg",alt:"Open countryside and land"}].map(image => <img key={image.category} className={`hero-category-background${(heroCategory || "Homes") === image.category ? " is-active" : ""}`} src={image.src} alt={image.alt} aria-hidden={(heroCategory || "Homes") !== image.category} {...{ fetchpriority: image.category === "Homes" ? "high" : "low" }} decoding="async" width={1672} height={941} />)}</div>
          <div data-hero-reveal className="hero-search-wrap"><PropertySearch /></div>
        </PageContainer>
      </section>
      <PropertyCategories />
      <InspectionShowcase listings={properties} />
      <WhyPropConnect />






      <section data-home-section="trust" className="home-trust home-section">
        <PageContainer className="home-trust-layout"><div data-section-reveal><p className="text-eyebrow">Confidence comes from clarity</p><h2 className="home-section-heading">A considered approach.<br />At every step.</h2><p className="home-body-copy">A verification badge is a useful starting point, not a guarantee. Inspect the property, check ownership documents and seek independent legal advice before committing.</p><Button asChild variant="outline"><Link to="/trust/safety-center">Visit our safety centre </Link></Button></div>
        <div className="home-trust-list">{[{icon:BadgeCheck,title:"Professional verification",text:"Review the verification status on a professional's profile.",to:"/trust/agent-verification"},{icon:FileCheck2,title:"Property review",text:"Listings pass through platform review. Confirm titles independently.",to:"/trust/property-verification"},{icon:LockKeyhole,title:"Protected document access",text:"Sensitive uploads are subject to access permissions. Share only what is needed.",to:"/privacy"},{icon:Eye,title:"Transaction visibility",text:"Follow enquiries and deal updates in your account. Financial operations remain locked.",to:"/dashboard"},{icon:Shield,title:"Marketplace moderation",text:"Read our conduct standards and contact support about concerns.",to:"/trust/code-of-conduct"}].map((item,i)=><Link data-section-reveal className="home-trust-item" key={item.title} to={item.to}><span className="home-trust-icon-panel"><span className="home-trust-icon-orbit" /><item.icon aria-hidden="true" /></span><div><span className="home-step-index">0{i+1}</span><h3>{item.title}</h3><p>{item.text}</p></div></Link>)}<Link to="/trust/safety-center" data-section-reveal className="home-trust-item home-trust-principle-card"><span className="home-trust-icon-panel"><span className="home-trust-icon-orbit" /><Shield aria-hidden="true" /></span><div><span className="home-step-index">06</span><h3>Clarity comes from asking questions.</h3><p>Verification is a starting point. Inspect the property, verify documents and seek independent advice.</p></div></Link></div></PageContainer>
      </section>



      <section data-home-section="developments" className="home-developments home-section">
        <PageContainer><div className="home-development-intro"><div className="home-development-photo" data-image-mask>{estateImage ? <img src={estateImage} alt={estates[0].title} loading="lazy" onError={event => { if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg"; }} /> : <div className="home-development-placeholder"><Building2 aria-hidden="true" /><p>Place. Potential.<br />Possibility.</p><span>Estate discovery</span></div>}<span>{estateImage ? "From the latest estate collection" : "Space for your next move"}</span></div><SectionHeading eyebrow="New perspectives on place" title="Space for what comes next." description="Explore estate listings within our latest reviewed collection. Development status, available units and project details must be confirmed with the listing professional." /></div>
        <div className="mt-8">{propertiesLoading ? <p role="status">Loading estate listings...</p> : propertiesError ? <div role="alert" className="home-empty"><h3>Estate listings are temporarily unavailable.</h3><Button onClick={()=>setPropertyRetry(n=>n+1)}>Retry estate listings</Button></div> : estates.length > 0 ? <PropertyCarousel properties={estates} /> : <div className="home-development-empty"><Building2 /><div><h3>A new perspective is taking shape.</h3><p>No estate listings in the latest collection. Explore the full estate search for current availability.</p></div></div>}</div><Button asChild variant="outline" className="mt-6"><Link to="/properties?type=estate">Explore estate listings </Link></Button></PageContainer>
      </section>

      <ExperienceCarousel />

      <section data-home-section="partnership" className="home-partnership">
        <PageContainer className="home-partnership-layout"><div data-section-reveal><p className="text-eyebrow">Built for property professionals</p><h2 className="home-section-heading">Your expertise.<br />A wider horizon.</h2><p className="home-body-copy">Bring your properties and professional perspective to PROP-CONNECT. Manage listings, respond to enquiries and follow your work in one place.</p><Button asChild><Link to="/register">Become an agent or builder </Link></Button></div><div className="home-partner-benefits">{[{n:"01",title:"Introduce yourself",text:"Create your account and choose your existing agent or builder onboarding path."},{n:"02",title:"Build your profile",text:"Complete the platform's profile and verification requirements."},{n:"03",title:"Make meaningful connections",text:"Share reviewed listings and keep conversations organised in your dashboard."}].map(item=><div data-section-reveal key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div></PageContainer>
      </section>

      <section data-home-section="resources" className="page-container home-section">
        <div className="home-section-top"><SectionHeading eyebrow="A little knowledge. A clearer next step." title="Read before you move." description="Practical guides and safety information to help you make a considered property decision." /><span className="home-editorial-note">Your property reading list</span></div>
        <div className="home-resources">{[{n:"01",title:"Investing in Nigerian property",text:"Understand the considerations before starting your property journey.",to:"/guides/investing-in-nigeria",category:"Property guide"},{n:"02",title:"Know what to verify",text:"Learn about property review and independent document checks.",to:"/trust/property-verification",category:"Due diligence"},{n:"03",title:"A safer search starts with you",text:"Recognise warning signs and read the platform's fraud prevention guidance.",to:"/trust/fraud-prevention",category:"Safety resource"}].map(item=><Link data-section-reveal className="home-resource" key={item.n} to={item.to}><span className="home-resource-number">{item.n}</span><div><p className="text-eyebrow">{item.category}</p><h3>{item.title}</h3><p>{item.text}</p></div></Link>)}</div>
      </section>

      <HomeFaq />
      </main>
      <Footer />
    </div></HomeMotion>
  );
};

export default Index;
