import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Bed, Bath, Maximize, MessageCircle, CalendarCheck, ShieldCheck, Star, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { TrustScoreRing } from "@/components/AgentCard";
import { properties, formatPrice, getTrustBadge } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DBAgent } from "@/pages/Agents";

const PropertyDetail = () => {
  const { id } = useParams();
  const property = properties.find((p) => p.id === id);
  const { user, profile } = useAuth();
  const [agent, setAgent] = useState<DBAgent | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buyer_name: "",
    buyer_phone: "",
    buyer_email: "",
    viewing_date: "",
    message: "",
  });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        buyer_name: profile.full_name || f.buyer_name,
        buyer_phone: profile.phone || f.buyer_phone,
        buyer_email: user?.email || f.buyer_email,
      }));
    }
  }, [profile, user]);

  useEffect(() => {
    if (!property) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", property.agentId)
      .maybeSingle()
      .then(({ data }) => setAgent(data as DBAgent | null));
  }, [property]);

  const handleReserve = async () => {
    if (!user || !profile || !property) {
      toast.error("Please log in to reserve a property");
      return;
    }
    if (!form.buyer_name || !form.buyer_phone || !form.buyer_email || !form.viewing_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      property_id: property.id,
      buyer_id: profile.id,
      agent_id: property.agentId,
      buyer_name: form.buyer_name,
      buyer_phone: form.buyer_phone,
      buyer_email: form.buyer_email,
      message: form.message || null,
      viewing_date: form.viewing_date,
      notes: form.message || null,
    } as any);
    setSubmitting(false);

    if (error) {
      toast.error("Failed to submit reservation");
      console.error(error);
      return;
    }

    // Notify agent
    if (agent) {
      await (supabase as any).from("notifications").insert({
        user_id: agent.user_id || property.agentId,
        title: "New Reservation Request 🏠",
        message: `${form.buyer_name} has requested to reserve "${property.title}" for ${form.viewing_date}.`,
        type: "info",
        link: "/agent-dashboard",
      });
    }

    toast.success("Reservation submitted successfully!");
    setShowReserveModal(false);
  };

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
              <Button
                onClick={() => setShowReserveModal(true)}
                className="mt-3 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base py-6 rounded-xl font-semibold"
              >
                <CalendarCheck className="h-5 w-5" /> Reserve Property
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

      {/* Reservation Modal */}
      <Dialog open={showReserveModal} onOpenChange={setShowReserveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Reserve Property</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{property.title}</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="r-name">Full Name *</Label>
              <Input id="r-name" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="r-phone">Phone Number *</Label>
              <Input id="r-phone" value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} placeholder="+234..." />
            </div>
            <div>
              <Label htmlFor="r-email">Email *</Label>
              <Input id="r-email" type="email" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} placeholder="you@email.com" />
            </div>
            <div>
              <Label htmlFor="r-date">Preferred Viewing Date *</Label>
              <Input id="r-date" type="date" value={form.viewing_date} onChange={(e) => setForm({ ...form, viewing_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="r-msg">Message to Agent</Label>
              <Textarea id="r-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Any special requests or questions..." rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReserveModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleReserve} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Reservation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyDetail;
