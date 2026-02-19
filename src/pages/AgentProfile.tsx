import { useParams, Link } from "react-router-dom";
import { MapPin, Star, ShieldCheck, ArrowLeft, Building, Handshake, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { TrustScoreRing } from "@/components/AgentCard";
import { agents, properties, reviews, getTrustBadge } from "@/lib/mockData";

const AgentProfile = () => {
  const { id } = useParams();
  const agent = agents.find((a) => a.id === id);
  if (!agent) return <div className="flex min-h-screen items-center justify-center"><p>Agent not found</p></div>;

  const badge = getTrustBadge(agent.trustScore);
  const agentProperties = properties.filter((p) => p.agentId === agent.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Link to="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Agents
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <img src={agent.avatar} alt={agent.name} className="h-24 w-24 rounded-xl object-cover ring-2 ring-border" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">{agent.name}</h1>
                {agent.verificationLevel !== "unverified" && <ShieldCheck className="h-5 w-5 text-success" />}
                <Badge variant="outline" className={`text-xs ${
                  badge.color === "trust-high" ? "border-success/30 text-success" :
                  badge.color === "trust-medium" ? "border-warning/30 text-warning" :
                  "border-destructive/30 text-destructive"
                }`}>{badge.label}</Badge>
              </div>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{agent.location}</p>
              <p className="mt-2 text-muted-foreground">{agent.bio}</p>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-2xl font-bold text-foreground">{agent.rating}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-secondary text-secondary" /> Rating</p></div>
                <div><p className="text-2xl font-bold text-foreground">{agent.reviewCount}</p><p className="text-xs text-muted-foreground">Reviews</p></div>
                <div><p className="text-2xl font-bold text-foreground">{agent.propertiesListed}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Building className="h-3 w-3" /> Listed</p></div>
                <div><p className="text-2xl font-bold text-foreground">{agent.completedTransactions}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Handshake className="h-3 w-3" /> Deals</p></div>
              </div>
            </div>
            <TrustScoreRing score={agent.trustScore} />
          </div>

          <div className="mt-6 flex gap-3">
            <Link to={`/chat/${agent.id}`}>
              <Button className="gap-2 bg-primary text-primary-foreground"><MessageCircle className="h-4 w-4" /> Chat with Agent</Button>
            </Link>
          </div>
        </div>

        {/* Properties */}
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-foreground">Listings ({agentProperties.length})</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agentProperties.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
          {agentProperties.length === 0 && <p className="mt-4 text-muted-foreground">No listings yet.</p>}
        </div>

        {/* Reviews */}
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-foreground">Reviews</h2>
          <div className="mt-4 space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{r.buyerName}</h4>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-secondary text-secondary" : "text-border"}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">Re: {r.propertyTitle} · {r.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default AgentProfile;
