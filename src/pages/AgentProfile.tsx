import { siteUrl } from "@/lib/seo";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { MapPin, ArrowLeft, Building, Handshake, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { TrustScoreRing } from "@/components/AgentCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTrustBadge } from "@/lib/mockData";
import type { DBAgent } from "@/pages/Agents";
import VerifiedBadge from "@/components/VerifiedBadge";

const AgentProfile = () => {
  const { id } = useParams();
  const { profile: myProfile } = useAuth();
  const [agent, setAgent] = useState<DBAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentProperties, setAgentProperties] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [agentRes, propsRes, ratingsRes] = await Promise.all([
        (supabase as any).from("public_profiles").select("*").eq("id", id).eq("profile_type", "agent").maybeSingle(),
        supabase.from("properties").select("*").eq("agent_id", id!).eq("is_verified", true).in("status", ["available", "for_sale", "for_rent"]),
        supabase.from("ratings").select("*, profiles!ratings_reviewer_id_fkey(full_name)").eq("agent_id", id!).order("created_at", { ascending: false }),
      ]);
      setAgent(agentRes.data as DBAgent | null);
      setAgentProperties(propsRes.data || []);
      setRatings(ratingsRes.data || []);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

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

  const badge = getTrustBadge(agent.trust_score);
  const showChat = agent.is_visible && myProfile && myProfile.id !== agent.id;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${agent.full_name} — Verified Agent | Prop Connect`.slice(0, 60)}</title>
        <meta name="description" content={(agent.bio || `${agent.full_name} is a verified real estate agent on Prop Connect${agent.location ? ` based in ${agent.location}` : ""}.`).slice(0, 155)} />
        <link rel="canonical" href={siteUrl(`/agent/${agent.id}`)} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={siteUrl(`/agent/${agent.id}`)} />
        <meta property="og:title" content={`${agent.full_name} — Verified Agent | Prop Connect`} />
        <meta property="og:description" content={(agent.bio || `Verified real estate agent on Prop Connect.`).slice(0, 155)} />
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
      <div className="container mx-auto px-4 py-6">
        <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Agents
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <img
              src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=random`}
              alt={agent.full_name}
              className="h-24 w-24 rounded-xl object-cover ring-2 ring-border"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{agent.full_name}</h1>
                {agent.kyc_verified ? (
                  <VerifiedBadge />
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Pending Verification</Badge>
                )}
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">{badge.label}</Badge>
              </div>
              {agent.location && (
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />{agent.location}
                </p>
              )}
              {agent.bio && <p className="mt-2 text-muted-foreground">{agent.bio}</p>}
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">{agent.trust_score}</p>
                  <p className="text-xs text-muted-foreground">Trust Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{agent.properties_listed}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Building className="h-3 w-3" /> Listed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{agent.completed_transactions}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Handshake className="h-3 w-3" /> Deals</p>
                </div>
              </div>
            </div>
            <TrustScoreRing score={agent.trust_score} />
          </div>

          {showChat && (
            <div className="mt-6 flex gap-3">
              <Link to={`/chat/new?agent=${agent.id}`}>
                <Button className="gap-2 bg-primary text-primary-foreground">
                  <MessageCircle className="h-4 w-4" /> Chat with Agent
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Properties */}
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-foreground">Listings ({agentProperties.length})</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agentProperties.map((p) => (
              <Link key={p.id} to={`/property/${p.id}`} className="rounded-lg border border-border bg-card p-4 hover:shadow-elevated transition-shadow">
                {p.image_url && <img src={p.image_url} alt={p.title} className="h-40 w-full rounded-md object-cover mb-3" />}
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground">₦{(p.price || 0).toLocaleString()}</p>
              </Link>
            ))}
          </div>
          {agentProperties.length === 0 && <p className="mt-4 text-muted-foreground">No listings yet.</p>}
        </div>

        {/* Ratings */}
        {ratings.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl font-bold text-foreground">Reviews</h2>
            <div className="mt-4 space-y-4">
              {ratings.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{r.profiles?.full_name || "Anonymous"}</h4>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-secondary text-secondary" : "text-border"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentProfile;
