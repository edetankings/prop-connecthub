import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Bed, Bath, Maximize, MessageCircle, CalendarCheck, ShieldCheck, Star, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { TrustScoreRing } from "@/components/AgentCard";
import { properties, formatPrice, getTrustBadge } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import type { DBAgent } from "@/pages/Agents";

const PropertyDetail = () => {
  const { id } = useParams();
  const property = properties.find((p) => p.id === id);
  const [agent, setAgent] = useState<DBAgent | null>(null);

  useEffect(() => {
    if (!property) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", property.agentId)
      .maybeSingle()
      .then(({ data }) => setAgent(data as DBAgent | null));
  }, [property]);

  if (!property) return <div className="flex min-h-screen items-center justify-center"><p>Property not found</p></div>;

  const badge = agent ? getTrustBadge(agent.trust_score) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Link to="/properties" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl">
              <img src={property.image} alt={property.title} className="h-72 w-full object-cover md:h-96" />
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{property.title}</h1>
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{property.location}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-secondary md:text-3xl">{formatPrice(property.price)}</p>
                  {property.type === "rent" && <span className="text-sm text-muted-foreground">per year</span>}
                </div>
              </div>

              <div className="mt-4 flex gap-4 text-muted-foreground">
                {property.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-5 w-5" /> {property.bedrooms} Beds</span>}
                <span className="flex items-center gap-1"><Bath className="h-5 w-5" /> {property.bathrooms} Baths</span>
                <span className="flex items-center gap-1"><Maximize className="h-5 w-5" /> {property.sqft} sqft</span>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Description</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{property.description}</p>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Features</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {property.features.map((f) => (
                    <span key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex gap-3">
                <Link to={`/chat/new?agent=${property.agentId}&property=${property.id}`} className="flex-1">
                  <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <MessageCircle className="h-4 w-4" /> Chat with Agent
                  </Button>
                </Link>
              </div>
              <Button className="mt-3 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <CalendarCheck className="h-4 w-4" /> Reserve Property
              </Button>
            </div>

            {agent && (
              <Link to={`/agent/${agent.id}`} className="block rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
                <div className="flex items-center gap-3">
                  <img
                    src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=random`}
                    alt={agent.full_name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-border"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-display font-semibold text-foreground">{agent.full_name}</h3>
                      {agent.kyc_verified && <ShieldCheck className="h-4 w-4 text-success" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{agent.properties_listed} listings · {agent.completed_transactions} deals</span>
                  </div>
                  <TrustScoreRing score={agent.trust_score} />
                </div>
                {badge && (
                  <Badge variant="outline" className={`mt-3 text-xs ${
                    badge.color === "trust-high" ? "border-success/30 text-success" :
                    badge.color === "trust-medium" ? "border-warning/30 text-warning" :
                    "border-destructive/30 text-destructive"
                  }`}>
                    {badge.label}
                  </Badge>
                )}
              </Link>
            )}

            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-display font-semibold text-foreground">Escrow Protection</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your payment is held securely in escrow until all conditions are met. 99.2% success rate.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <ShieldCheck className="h-4 w-4" /> Protected Transaction
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
