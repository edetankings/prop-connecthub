import AgentDesignPreview, { previewAgentId } from "@/components/AgentDesignPreview";
import { siteUrl } from "@/lib/seo";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DBAgent } from "@/pages/Agents";
import AgentProfileView from "@/components/AgentProfileView";
import Footer from "@/components/Footer";

const LiveAgentProfile = () => {
  const { id } = useParams();
  const { profile: myProfile } = useAuth();
  const [agent, setAgent] = useState<DBAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentProperties, setAgentProperties] = useState<any[]>([]);
  const [queryError, setQueryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setQueryError(false);
      setAgentProperties([]);
      try {
        const [agentRes, propsRes, ratingsRes] = await Promise.all([
          (supabase as any).from("public_profiles").select("*").eq("id", id).eq("profile_type", "agent").maybeSingle(),
          supabase.from("properties").select("*").eq("agent_id", id!).eq("is_verified", true).in("status", ["available", "for_sale", "for_rent"]),
          supabase.from("ratings").select("*, profiles!ratings_reviewer_id_fkey(full_name)").eq("agent_id", id!).order("created_at", { ascending: false }),
        ]);
        if (agentRes.error || propsRes.error) throw agentRes.error || propsRes.error;
        if (!active) return;
        setAgent(agentRes.data as DBAgent | null);
        setAgentProperties(propsRes.data || []);
        setRatings(ratingsRes.data || []);
      } catch {
        if (active) setQueryError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, retry]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (queryError) return <div className="min-h-screen bg-background"><Navbar /><div role="alert" className="py-20 text-center"><p>Unable to load agent listings.</p><Button className="mt-4" onClick={() => setRetry((n) => n + 1)}>Retry</Button></div></div>;

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </div>
    );
  }

  const showChat = !!(agent.is_visible && myProfile && myProfile.id !== agent.id);

  return (
    <div className="agent-market-page">
      <Helmet>
        <title>{`${agent.full_name} — Property Agent | Prop Connect`.slice(0, 60)}</title>
        <meta name="description" content={(agent.bio || `${agent.full_name} is a real estate agent on Prop Connect${agent.location ? ` based in ${agent.location}` : ""}.`).slice(0, 155)} />
        <link rel="canonical" href={siteUrl(`/agent/${agent.id}`)} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={siteUrl(`/agent/${agent.id}`)} />
        <meta property="og:title" content={`${agent.full_name} — Property Agent | Prop Connect`} />
        <meta property="og:description" content={(agent.bio || `Real estate agent on Prop Connect.`).slice(0, 155)} />
        {agent.avatar_url && <meta property="og:image" content={agent.avatar_url} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: agent.full_name,
          image: agent.avatar_url || undefined,
          jobTitle: "Real Estate Agent",
          address: agent.location || undefined,
          url: siteUrl(`/agent/${agent.id}`),
          worksFor: { "@type": "Organization", name: "Prop Connect" },
        })}</script>
      </Helmet>
      <Navbar />
      <AgentProfileView agent={agent} properties={agentProperties} reviews={ratings} showChat={showChat} />
      <Footer />
    </div>
  );
};

export default function AgentProfile() {
  const { id } = useParams();
  return id === previewAgentId ? <AgentDesignPreview /> : <LiveAgentProfile />;
}
