import { publicAgent } from "@/lib/publicAgent";
import PropertyDetailsLayout from "@/components/PropertyDetailsLayout";
import type { DBProperty } from "@/components/DBPropertyCard";
import { siteUrl } from "@/lib/seo";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { MessageCircle, CalendarCheck, CheckCircle, Bookmark, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import VerifiedBadge from "@/components/VerifiedBadge";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DBAgent } from "@/pages/Agents";
import Footer from "@/components/Footer";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";

interface DBPropertyDetail {
  id: string;
  title: string;
  price: number;
  property_type: string;
  status: string;
  listing_type?: "sale" | "rental" | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
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
  latitude: number | null;
  longitude: number | null;
  property_code: string | null;
}

const PropertyDetail = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();

  // DB property state
  const [dbProperty, setDbProperty] = useState<DBPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<DBAgent | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [similar,setSimilar] = useState<DBProperty[]>([]);
  const [similarLoading,setSimilarLoading] = useState(false);
  const [similarError,setSimilarError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const reservationPending = useRef(false);
  const { saved, toggle: toggleSaved } = useLocalFavorites(id || "");
  const [form, setForm] = useState({
    buyer_name: "",
    viewing_date: "",
    message: "",
    inspection_time: "",
  });
  const [showDealSummary, setShowDealSummary] = useState(false);
  const [dealMessage, setDealMessage] = useState("");
  const [dealId, setDealId] = useState<string | null>(null);

  const [queryError, setQueryError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        buyer_name: profile.full_name || f.buyer_name,
      }));
    }
  }, [profile]);

  // Discard stale responses after route changes; never replace missing rows with demo data.
  useEffect(() => {
    let active = true;
    setDbProperty(null);
    setQueryError(false);
    setLoading(true);
    const load = async () => {
      try {
        if (!id) return;
        const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        if (active) setDbProperty(data as DBPropertyDetail | null);
      } catch {
        if (active) setQueryError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, retry]);

  // Fetch agent profile
  const agentId = dbProperty?.agent_id;
  useEffect(() => {
    let active = true;
    setAgent(null);
    if (!agentId) return;
    void (async () => {
      try {
        const { data, error } = await supabase.from("public_profiles").select("*").eq("id", agentId).maybeSingle();
        if (active && !error) setAgent(publicAgent(data));
      } catch {
        // Keep the agent unavailable rather than showing a stale or fabricated profile.
      }
    })();
    return () => { active = false; };
  }, [agentId]);

  useEffect(()=>{
    let active=true;
    setSimilar([]);setSimilarError(false);
    if(!dbProperty) return;
    setSimilarLoading(true);
    void (async()=>{try {
      const result=await supabase.from("properties").select("*").eq("is_verified",true).in("status",["available","for_sale","for_rent"]).eq("property_type",dbProperty.property_type).order("created_at",{ascending:false}).limit(18);
      if(result.error) throw result.error;
      const candidates=(result.data || []).filter(property=>property.id!==dbProperty.id);
      candidates.sort((a,b)=>Number(b.city===dbProperty.city)-Number(a.city===dbProperty.city) || Math.abs(a.price-dbProperty.price)-Math.abs(b.price-dbProperty.price));
      if(active)setSimilar(candidates.slice(0,3) as DBProperty[]);
    }catch{if(active)setSimilarError(true);}finally{if(active)setSimilarLoading(false);}})();
    return ()=>{active=false;};
  },[dbProperty]);

  const [alreadyReserved, setAlreadyReserved] = useState(false);
  const [dealStatus, setDealStatus] = useState<string | null>(null);
  const [requestingDeal, setRequestingDeal] = useState(false);

  // Check for existing reservation by this user
  useEffect(() => {
    if (!profile?.id || !id) return;
    (supabase as any)
      .from("reservations")
      .select("id")
      .eq("buyer_id", profile.id)
      .eq("property_id", id)
      .in("inspection_status", ["requested", "confirmed", "reschedule_proposed"])
      .maybeSingle()
      .then(({ data }: any) => setAlreadyReserved(!!data));
  }, [profile?.id, id]);

  // Check for existing deal request by this buyer
  useEffect(() => {
    if (!user?.id || !id) return;
    (supabase as any)
      .from("deal_requests")
      .select("id, status")
      .eq("buyer_id", user.id)
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => { setDealStatus(data?.status || null); setDealId(data?.id || null); });
  }, [user?.id, id]);

  const handleRequestDeal = async () => {
    if (!user) { toast.error("Please log in"); return; }
    if (!id) return;
    setRequestingDeal(true);
    const { error } = await (supabase as any).rpc("request_deal", {
      _property_id: id,
      _message: dealMessage.trim() || null,
    });
    setRequestingDeal(false);
    if (error) { toast.error(error.message); return; }
    setShowDealSummary(false);
    toast.success("Request sent — waiting for agent confirmation.");
    setDealStatus("pending");
  };


  const isRental = dbProperty?.listing_type === "rental";
  const isOwner = profile?.id === (dbProperty?.agent_id);

  const handleReserve = async () => {
    if (reservationPending.current) return;
    if (!user || !profile) {
      toast.error("Please log in to book an inspection");
      return;
    }
    if (isOwner) {
      toast.error("You cannot reserve your own property");
      return;
    }
    const propId = dbProperty?.id;
    const propAgentId = dbProperty?.agent_id;
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
    const [year, month, day] = form.viewing_date.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isFinite(selectedDate.getTime()) || selectedDate < today) {
      toast.error("Viewing date must be today or in the future");
      return;
    }
    reservationPending.current = true;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reservations").insert({
        property_id: propId, buyer_id: profile.id, agent_id: propAgentId,
        buyer_name: form.buyer_name, message: form.message || null, viewing_date: form.viewing_date,
        notes: form.message || null, inspection_time: form.inspection_time || null,
      });
      if (error) { toast.error("Failed to send inspection request"); return; }
      setAlreadyReserved(true);
      setShowReserveModal(false);
      toast.success("Inspection request sent to the agent.");
      // Preserve the existing chat initialization; a chat failure must not misreport a saved request.
      try {
        const { data: existingThread } = await supabase.from("chat_threads").select("id")
          .eq("buyer_id", profile.id).eq("agent_id", propAgentId).eq("property_id", propId).maybeSingle();
        if (!existingThread) {
          const { error: chatError } = await supabase.from("chat_threads").insert({ buyer_id: profile.id, agent_id: propAgentId, property_id: propId });
          if (chatError) toast.warning("Your inspection request was sent. Open Messages to contact the agent.");
        }
      } catch { toast.warning("Your inspection request was sent. Open Messages to contact the agent."); }
    } catch { toast.error("Failed to send inspection request. Please try again."); }
    finally { reservationPending.current = false; setSubmitting(false); }
  };


  const handleSave = () => { toggleSaved(); };

  // Loading state
  if (loading) {
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
  if (!dbProperty) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Navbar />
        <div className="mt-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">{queryError ? "Unable to load property." : "Property not found."}</h1>
          <p className="mt-2 text-muted-foreground">{queryError ? "Please try again." : "This listing may have been removed or does not exist."}</p>
          {queryError && <Button className="mt-4" onClick={() => setRetry((n) => n + 1)}>Retry</Button>}
          <Link to="/properties">
            <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Only confirmed database records are rendered.
  const title = dbProperty?.title || "";
  const price = dbProperty?.price || 0;
  const location = dbProperty
    ? [dbProperty.city, dbProperty.state].filter(Boolean).join(", ") || "Nigeria"
    : "";
  const propertyId = dbProperty?.id || "";
  const propertyAgentId = dbProperty?.agent_id || "";

  // Images
  const allImages: string[] = [];
  if (dbProperty?.image_url) allImages.push(dbProperty.image_url);
  if (dbProperty?.images?.length) allImages.push(...dbProperty.images.filter((img) => img !== dbProperty.image_url));
  if (!allImages.length) allImages.push("/placeholder.svg");


  return (
    <div className="property-detail-page min-h-screen bg-background">
      {(() => {
        const p = dbProperty;
        if (!p) return null;
        const pUrl = siteUrl(`/property/${p.id}`);
        const loc = [p?.city, p?.state].filter(Boolean).join(", ");
        const title = `${p.title}${loc ? ` — ${loc}` : ""} | Prop Connect`;
        const desc = (p.description || `${p.title} listed on Prop Connect.${loc ? ` Located in ${loc}.` : ""}`).slice(0, 155);
        const img = p.image_url || p.images?.[0];
        return (
          <Helmet>
            <title>{title.slice(0, 60)}</title>
            <meta name="description" content={desc} />
            <link rel="canonical" href={pUrl} />
            <meta property="og:type" content="product" />
            <meta property="og:url" content={pUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={desc} />
            {img && <meta property="og:image" content={img} />}
            <script type="application/ld+json">{JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.title,
              description: desc,
              image: img || undefined,
              offers: {
                "@type": "Offer",
                price: p.price,
                priceCurrency: "NGN",
                availability: ["available", "for_sale", "for_rent"].includes(p.status)
                  ? "https://schema.org/InStock"
                  : ["sold", "rented"].includes(p.status) ? "https://schema.org/SoldOut" : undefined,
                url: pUrl,
              },
            })}</script>
          </Helmet>
        );
      })()}
      <Navbar />
      <PropertyDetailsLayout property={dbProperty} agent={agent} saved={saved} onSave={handleSave} similar={similar} similarLoading={similarLoading} similarError={similarError} locationVisibility="approximate" actions={<>
              {!isOwner && (
                <div className="flex gap-3">
                  {user ? (
                    <Link to={`/chat/new?agent=${propertyAgentId}&property=${propertyId}`} className="flex-1">
                      <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <MessageCircle className="h-4 w-4" /> Chat with Agent
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
              {!isOwner && user && (
                dealStatus === "accepted" ? (
                  <Link to={dealId ? `/deal/${dealId}` : `/secure-payment/${propertyId}`} className="block">
                    <Button className="mt-3 w-full gap-2 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 text-base py-6 rounded-xl font-semibold shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]">
                      <Lock className="h-5 w-5" /> Open Deal Room
                    </Button>
                  </Link>
                ) : dealStatus === "pending" ? (
                  <Button disabled className="mt-3 w-full gap-2 text-base py-6 rounded-xl font-semibold" variant="outline">
                    <Lock className="h-5 w-5" /> Waiting for agent confirmation…
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowDealSummary(true)}
                    disabled={
                      requestingDeal ||
                      dbProperty?.status === "payment_pending" ||
                      dbProperty?.status === "transaction_in_progress" ||
                      dbProperty?.status === "sold" ||
                      dbProperty?.status === "rented"
                    }
                    className="mt-3 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-base py-6 rounded-xl font-semibold shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]"
                  >
                    <Lock className="h-5 w-5" />
                    {dbProperty?.status === "payment_pending" || dbProperty?.status === "transaction_in_progress"
                      ? "Reserved — Payment in Progress"
                      : dbProperty?.status === "sold" || dbProperty?.status === "rented"
                      ? "No longer available"
                      : dealStatus === "declined"
                      ? "Request Again"
                      : isRental ? "Enquire about renting" : "Enquire about buying"}
                  </Button>
                )
              )}
              {!isOwner && user && dealStatus !== "accepted" && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Enquiries do not require payment. Financial operations remain locked.
                </p>
              )}
              {!isOwner && !user && (
                <Link to="/login" className="block mt-3">
                  <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-base py-6 rounded-xl font-semibold">
                    <Lock className="h-5 w-5" /> Log in to Buy or Rent
                  </Button>
                </Link>
              )}

              {!isOwner && (
                alreadyReserved ? (
                  <div className="mt-3 w-full text-center py-4 rounded-xl bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] font-semibold text-sm flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Inspection Requested
                  </div>
                ) : user ? (
                  <Button
                    onClick={() => setShowReserveModal(true)}
                    variant="outline"
                    className="mt-3 w-full gap-2 text-base py-6 rounded-xl font-semibold"
                  >
                    <CalendarCheck className="h-5 w-5" /> Book Inspection
                  </Button>
                ) : null
              )}
              <Button
                variant="outline"
                onClick={handleSave}
                aria-pressed={saved}
                className="mt-3 w-full gap-2"
              >
                <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved to this device" : "Save Property"}
              </Button>
      </>} mobileActions={!isOwner && <div className="property-mobile-actions"><Button asChild variant="outline"><Link to={user ? `/chat/new?agent=${propertyAgentId}&property=${propertyId}` : "/login"}><MessageCircle />{user ? "Message" : "Log in"}</Link></Button>{user ? <Button disabled={alreadyReserved || submitting} onClick={() => setShowReserveModal(true)}><CalendarCheck />{alreadyReserved ? "Requested" : "Request inspection"}</Button> : <Button asChild><Link to="/login">Log in to enquire</Link></Button>}</div>} />
      <Footer />

      {/* Reservation Modal */}
      <Dialog open={showReserveModal} onOpenChange={setShowReserveModal}>
        <DialogContent className="inspection-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Request an inspection</DialogTitle>
            <DialogDescription>Choose a preferred time. The agent must confirm availability.</DialogDescription>
            <div className="inspection-property-context"><img src={allImages[0]} alt="" /><div><h2>{title}</h2><p>{location}</p></div></div>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={event => { event.preventDefault(); void handleReserve(); }}>
            <div>
              <Label htmlFor="r-name">Full Name *</Label>
              <Input required autoComplete="name" id="r-name" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="r-date">Preferred Date *</Label>
              <Input required min={`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`} id="r-date" type="date" value={form.viewing_date} onChange={(e) => setForm({ ...form, viewing_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="r-time">Preferred Time</Label>
              <Input id="r-time" type="time" value={form.inspection_time} onChange={(e) => setForm({ ...form, inspection_time: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="r-msg">Message to Agent</Label>
              <Textarea id="r-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Any special requests or questions..." rows={3} />
            </div>
            <p className="inspection-note">Your request is not a confirmed booking. The agent can confirm, propose another time or decline. Account messaging remains available.</p>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowReserveModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Request Inspection"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deal Summary */}
      <Dialog open={showDealSummary} onOpenChange={setShowDealSummary}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Deal Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <img src={dbProperty?.image_url || dbProperty?.images?.[0] || "/placeholder.svg"} alt={title} className="h-40 w-full rounded-xl object-cover" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">{title}</p>
              {dbProperty?.property_code && <p className="font-mono text-xs text-muted-foreground">{dbProperty.property_code}</p>}
              <p className="text-muted-foreground">{location}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">₦{Number(dbProperty?.price || 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Type</p><p className="font-semibold">{isRental ? "Rent" : "Purchase"}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Agent</p>
                <p className="flex items-center gap-1 font-semibold">{agent?.full_name || "Agent"} {agent?.kyc_verified && <VerifiedBadge size="sm" />}
                  {agent && <span className="ml-auto text-xs font-normal text-muted-foreground">Trust {agent.trust_score}/100</span>}</p>
              </div>
            </div>
            <div>
              <Label htmlFor="d-msg">Message to agent (optional)</Label>
              <Textarea id="d-msg" rows={3} value={dealMessage} onChange={(e) => setDealMessage(e.target.value)} placeholder="Any questions or conditions…" />
            </div>
            <p className="text-xs text-muted-foreground">Nothing is paid now. The agent must confirm the property is available. Financial operations remain locked. Never pay an agent directly.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDealSummary(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRequestDeal} disabled={requestingDeal}>
                {requestingDeal ? "Sending…" : isRental ? "Request to Rent" : "Request to Buy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default PropertyDetail;
