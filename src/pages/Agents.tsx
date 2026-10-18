import { siteUrl } from "@/lib/seo";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight, Search, ShieldCheck, Users } from "lucide-react";
import Footer from "@/components/Footer";
import { PreviewAgentCard } from "@/components/AgentDesignPreview";
import agentsArt from "@/assets/agents-banner.png";
import Navbar from "@/components/Navbar";
import AgentCard from "@/components/AgentCard";
import { supabase } from "@/integrations/supabase/client";

export interface DBAgent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trust_score: number;
  kyc_verified: boolean;
  location: string | null;
  bio: string | null;
  properties_listed: number;
  completed_transactions: number;
  is_visible: boolean;
}

const Agents = () => {
  const [agents, setAgents] = useState<DBAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState("trust");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(false);
      try {
        const result = await supabase.from("public_profiles").select("*").eq("profile_type", "agent").order("trust_score", { ascending: false });
        if (result.error) throw result.error;
        const profiles = (result.data || []).filter(profile => profile.id !== null);
        const counts: Record<string, number> = {};
        if (profiles.length) {
          const properties = await supabase.from("properties").select("agent_id").in("agent_id", profiles.map(profile => profile.id!)).eq("is_verified", true).in("status", ["available", "for_sale", "for_rent"]);
          if (properties.error) throw properties.error;
          properties.data?.forEach(property => { counts[property.agent_id] = (counts[property.agent_id] || 0) + 1; });
        }
        if (active) setAgents(profiles.map(profile => ({ id:profile.id!,full_name:profile.full_name || "Property professional",avatar_url:profile.avatar_url,trust_score:profile.trust_score ?? 0,kyc_verified:profile.kyc_verified ?? false,location:profile.location,bio:profile.bio,properties_listed:counts[profile.id!] || 0,completed_transactions:profile.completed_transactions ?? 0,is_visible:profile.is_visible ?? false })));
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [retry]);
  const locations = Array.from(new Set(agents.map(agent => agent.location).filter((value): value is string => !!value)));
  const filtered = agents.filter(agent => (!verified || agent.kyc_verified) && (!location || agent.location === location) && `${agent.full_name} ${agent.location || ""} ${agent.bio || ""}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => sort === "name" ? a.full_name.localeCompare(b.full_name) : sort === "listings" ? b.properties_listed-a.properties_listed : b.trust_score-a.trust_score);
  const showPreview = !verified && (!location || location === "Lagos, Nigeria") && "Tobi Akin Lagos Nigeria Chapter Homes".toLowerCase().includes(query.toLowerCase());
  return <div className="agent-market-page"><Helmet><title>Property Agents in Nigeria — Prop Connect</title><meta name="description" content="Meet property professionals across Nigeria. Explore public profiles, reviewed listings and agent verification status." /><link rel="canonical" href={siteUrl("/agents")} /><meta property="og:url" content={siteUrl("/agents")} /></Helmet><Navbar /><main className="page-container agent-directory-main"><section className="agent-directory-hero"><div><span className="agent-hero-eyebrow"><ShieldCheck /> People behind the properties</span><h1>Find your property.<br /><span>Meet your professional.</span></h1><p>Connect with property agents across Nigeria. Explore their profiles, view listings and find someone who understands your next move.</p><a href="#agent-results">Find your agent <ArrowUpRight /></a></div><div className="agent-directory-art"><img src={agentsArt} alt="Illustrated Nigerian property professionals" /><span><ShieldCheck />Professional connections.<br />A clearer next step.</span></div></section><form className="agent-directory-search" onSubmit={event => { event.preventDefault(); setQuery(search); }}><label><Search aria-hidden="true" /><span className="sr-only">Search agents by name or location</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search agents by name or location…" /></label><label><span className="sr-only">Location</span><select value={location} onChange={event => setLocation(event.target.value)}><option value="">All locations</option>{Array.from(new Set([...locations,"Lagos, Nigeria"])).map(value => <option key={value}>{value}</option>)}</select></label><button className="agent-primary" type="submit">Search agents <Search /></button></form><div className="agent-directory-filters"><button type="button" aria-pressed={!verified} onClick={() => setVerified(false)}><Users />All agents</button><button type="button" aria-pressed={verified} onClick={() => setVerified(true)}><ShieldCheck />Verified only</button><p>Review verification status. Always carry out independent property checks.</p></div><section id="agent-results" className="agent-directory-results"><div className="agent-section-title"><div><h2>Property professionals</h2><p>{loading ? "Loading public profiles…" : `${filtered.length} real ${filtered.length === 1 ? "profile" : "profiles"}${showPreview ? " · 1 separate design preview" : ""}`}</p></div><label>Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="trust">Trust score</option><option value="listings">Listing count</option><option value="name">Name</option></select></label></div>{error && <div role="alert" className="agent-preview-notice">Could not load real agent profiles. <button type="button" onClick={() => setRetry(value => value+1)}>Retry</button></div>}{loading && <p role="status">Loading agents…</p>}<div className="agent-directory-grid">{showPreview && <PreviewAgentCard />}{!loading && !error && filtered.map(agent => <AgentCard key={agent.id} agent={agent} marketplace />)}</div>{!loading && !error && !filtered.length && !showPreview && <div className="agent-empty-panel"><h3>No matching agents.</h3><p>Try another name or reset the filters.</p></div>}</section></main><Footer /></div>;
};
export default Agents;
