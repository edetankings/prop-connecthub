import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapPin, Bed, Bath, Maximize, MessageCircle, CalendarCheck, ShieldCheck, ArrowLeft, CheckCircle, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { TrustScoreRing } from "@/components/AgentCard";
import { properties, formatPrice, getTrustBadge } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DBAgent } from "@/pages/Agents";

interface DBPropertyDetail {
  id: string;
  title: string;
  price: number;
  property_type: string;
  status: string;
  image_url: string | null;
  images: string[] | null;
  city: string | null;
  state: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  agent_id: string;
  description: string | null;
  is_verified: boolean;
  amenities: string[] | null;
}

const PropertyDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();

  // DB property state
  const [dbProperty, setDbProperty] = useState<DBPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<DBAgent | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buyer_name: "",
    viewing_date: "",
    message: "",
  });

  // Try mock data as fallback
  const mockProperty = properties.find((p) => p.id === id);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        buyer_name: profile.full_name || f.buyer_name,
      }));
    }
  }, [profile]);

  // Fetch property from DB
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setDbProperty(data as DBPropertyDetail | null);
        setLoading(false);
      });
  }, [id]);

  // Fetch agent profile
  const agentId = dbProperty?.agent_id || mockProperty?.agentId;
  useEffect(() => {
    if (!agentId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", agentId)
      .maybeSingle()
      .then(({ data }) => setAgent(data as DBAgent | null));
  }, [agentId]);

  const [alreadyReserved, setAlreadyReserved] = useState(false);

  // Check for existing reservation by this user
  useEffect(() => {
    if (!profile?.id || !id) return;
    (supabase as any)
      .from("reservations")
      .select("id")
      .eq("buyer_id", profile.id)
      .eq("property_id", id)
      .in("status", ["pending", "confirmed"])
      .maybeSingle()
      .then(({ data }: any) => setAlreadyReserved(!!data));
  }, [profile?.id, id]);

  const isOwner = profile?.id === (dbProperty?.agent_id || mockProperty?.agentId);

  const handleReserve = async () => {
    if (!user || !profile) {
      toast.error("Please log in to reserve a property");
      return;
    }
    if (isOwner) {
      toast.error("You cannot reserve your own property");
      return;
    }
    const propId = dbProperty?.id || mockProperty?.id;
    const propAgentId = dbProperty?.agent_id || mockProperty?.agentId;
    if (!propId || !propAgentId) return;

    if (!form.buyer_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!form.viewing_date) {
      toast.error("Viewing date is required");
      return;
    }
    // Validate future date
    const selectedDate = new Date(form.viewing_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error("Viewing date must be today or in the future");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      property_id: propId,
      buyer_id: profile.id,
      agent_id: propAgentId,
      buyer_name: form.buyer_name,
      message: form.message || null,
      viewing_date: form.viewing_date,
      notes: form.message || null,
    });

    // Auto-create a chat thread between buyer and agent for this property
    if (!error) {
      // Check if a thread already exists
      const { data: existingThread } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("buyer_id", profile.id)
        .eq("agent_id", propAgentId)
        .eq("property_id", propId)
        .maybeSingle();

      if (!existingThread) {
        await supabase.from("chat_threads").insert({
          buyer_id: profile.id,
          agent_id: propAgentId,
          property_id: propId,
        });
      }
    }
    setSubmitting(false);

    if (error) {
      toast.error("Failed to submit reservation");
      console.error(error);
      return;
    }

    // Notify agent
    if (agent) {
      const title = dbProperty?.title || mockProperty?.title || "a property";
      await supabase.from("notifications").insert({
        user_id: agent.user_id,
        title: "New Reservation Request 🏠",
        message: `${form.buyer_name} has requested to reserve "${title}" for ${form.viewing_date}.`,
        type: "info",
        link: "/dashboard/agent",
      } as any);
    }

    toast.success("Reservation submitted successfully!");
    setAlreadyReserved(true);
    setShowReserveModal(false);
  };

  const handleSave = () => {
    toast.success("Property saved to your favorites!");
  };

  // Loading state
  if (loading && !mockProperty) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Skeleton className="h-72 w-full rounded-xl md:h-96" />
              <Skeleton className="mt-6 h-8 w-3/4" />
              <Skeleton className="mt-2 h-5 w-1/2" />
            </div>
            <div><Skeleton className="h-64 w-full rounded-xl" /></div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!loading && !dbProperty && !mockProperty) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Navbar />
        <div className="mt-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Property not found.</h1>
          <p className="mt-2 text-muted-foreground">This listing may have been removed or doesn't exist.</p>
          <Link to="/properties">
            <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Normalize data — prefer DB, fallback to mock
  const title = dbProperty?.title || mockProperty?.title || "";
  const price = dbProperty?.price || mockProperty?.price || 0;
  const location = dbProperty
    ? [dbProperty.address, dbProperty.city, dbProperty.state].filter(Boolean).join(", ") || "Nigeria"
    : mockProperty?.location || "";
  const description = dbProperty?.description || mockProperty?.description || "No description available.";
  const bedrooms = dbProperty?.bedrooms ?? mockProperty?.bedrooms ?? 0;
  const bathrooms = dbProperty?.bathrooms ?? mockProperty?.bathrooms ?? 0;
  const sqft = dbProperty?.sqft ?? mockProperty?.sqft ?? 0;
  const isSale = dbProperty
    ? (dbProperty.status === "for_sale" || dbProperty.status === "available")
    : mockProperty?.type === "sale";
  const isVerified = dbProperty?.is_verified ?? false;
  const features = dbProperty?.amenities ?? mockProperty?.features ?? [];
  const propertyId = dbProperty?.id || mockProperty?.id || "";
  const propertyAgentId = dbProperty?.agent_id || mockProperty?.agentId || "";

  // Images
  const allImages: string[] = [];
  if (dbProperty?.image_url) allImages.push(dbProperty.image_url);
  if (dbProperty?.images?.length) allImages.push(...dbProperty.images.filter((img) => img !== dbProperty.image_url));
  if (!allImages.length && mockProperty?.image) allImages.push(mockProperty.image);
  if (!allImages.length) allImages.push("/placeholder.svg");

  const badge = agent ? getTrustBadge(agent.trust_score) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Link to="/properties" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="overflow-hidden rounded-xl">
              <img src={allImages[0]} alt={title} className="h-72 w-full object-cover md:h-96" />
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {allImages.slice(1, 5).map((img, i) => (
                  <img key={i} src={img} alt={`${title} ${i + 2}`} className="h-20 w-28 flex-shrink-0 rounded-lg object-cover ring-1 ring-border" />
                ))}
              </div>
            )}

            <div className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
                    {isVerified && <Badge className="bg-success/90 text-success-foreground">Verified</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{location}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-secondary md:text-3xl">
                    {dbProperty ? `₦${price.toLocaleString()}` : formatPrice(price)}
                  </p>
                  {!isSale && <span className="text-sm text-muted-foreground">per year</span>}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Badge className={isSale ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
                  {isSale ? "For Sale" : "For Rent"}
                </Badge>
              </div>

              <div className="mt-4 flex gap-4 text-muted-foreground">
                {bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-5 w-5" /> {bedrooms} Beds</span>}
                {bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-5 w-5" /> {bathrooms} Baths</span>}
                {sqft > 0 && <span className="flex items-center gap-1"><Maximize className="h-5 w-5" /> {sqft} sqft</span>}
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Description</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
              </div>

              {features.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-display text-lg font-semibold text-foreground">Features</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {features.map((f) => (
                      <span key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              {!isOwner && (
                <div className="flex gap-3">
                  {user ? (
                    <Link to={`/chat/new?agent=${propertyAgentId}&property=${propertyId}`} className="flex-1">
                      <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <MessageCircle className="h-4 w-4" /> Message Agent
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/login" className="flex-1">
                      <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <MessageCircle className="h-4 w-4" /> Log in to Message
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {isOwner && (
                <p className="text-xs text-muted-foreground text-center py-2">This is your listing</p>
              )}
              {!isOwner && (
                alreadyReserved ? (
                  <div className="mt-3 w-full text-center py-4 rounded-xl bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] font-semibold text-sm flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Reservation Submitted
                  </div>
                ) : user ? (
                  <Button
                    onClick={() => setShowReserveModal(true)}
                    className="mt-3 w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base py-6 rounded-xl font-semibold"
                  >
                    <CalendarCheck className="h-5 w-5" /> Reserve Property
                  </Button>
                ) : (
                  <Link to="/login" className="block mt-3">
                    <Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base py-6 rounded-xl font-semibold">
                      <CalendarCheck className="h-5 w-5" /> Log in to Reserve
                    </Button>
                  </Link>
                )
              )}
              <Button
                variant="outline"
                onClick={handleSave}
                className="mt-3 w-full gap-2"
              >
                <Bookmark className="h-4 w-4" /> Save Property
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
                      {agent.kyc_verified ? (
                        <Badge className="bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] text-[10px] gap-0.5 px-1.5">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5">Pending</Badge>
                      )}
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
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="r-name">Full Name *</Label>
              <Input id="r-name" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="r-date">Preferred Viewing Date *</Label>
              <Input id="r-date" type="date" value={form.viewing_date} onChange={(e) => setForm({ ...form, viewing_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="r-msg">Message to Agent</Label>
              <Textarea id="r-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Any special requests or questions..." rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">A chat thread will be created automatically so you can communicate directly with the agent.</p>
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
