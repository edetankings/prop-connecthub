import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Building, MessageCircle, Star, Wallet, TrendingUp, ShieldCheck, AlertTriangle, FileText, Settings, LayoutDashboard, Trash2, CalendarCheck, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrustScoreRing } from "@/components/AgentCard";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import SecureTransactions from "@/components/SecureTransactions";

const AgentDashboard = () => {
  const { profile } = useAuth();
  const { isActive: subActive, daysRemaining } = useSubscription();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; escrow_balance: number } | null>(null);
  const [stats, setStats] = useState({ listings: 0, messages: 0, deals: 0, rating: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [updatingResId, setUpdatingResId] = useState<string | null>(null);


  const firstName = profile?.full_name?.split(" ")[0] || "Agent";

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from("properties")
      .select("*")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProperties(data || []);
        setStats((s) => ({ ...s, listings: data?.length || 0 }));
      });

    supabase
      .from("wallets")
      .select("balance, escrow_balance")
      .eq("user_id", profile.user_id)
      .maybeSingle()
      .then(({ data }) => setWallet(data));

    // Fetch reservations for this agent
    (supabase as any)
      .from("reservations")
      .select("*, properties(title, image_url, city, state, price)")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setReservations(data || []));

    setStats((s) => ({ ...s, deals: profile.completed_transactions || 0 }));
  }, [profile?.id]);

  const deleteProperty = async (id: string, status: string) => {
    if (status === "sold" || status === "rented") {
      toast.error("Cannot delete a sold or rented property");
      return;
    }
    if (!confirm("Are you sure you want to delete this property?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("properties").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Failed to delete property");
    else {
      toast.success("Property deleted");
      setProperties((prev) => prev.filter((p) => p.id !== id));
      setStats((s) => ({ ...s, listings: s.listings - 1 }));
    }
  };

  const handleReservation = async (resId: string, status: "confirmed" | "rejected", buyerId: string, propertyTitle: string) => {
    setUpdatingResId(resId);
    const { error } = await (supabase as any).from("reservations").update({ status }).eq("id", resId);
    setUpdatingResId(null);
    if (error) { toast.error("Failed to update reservation"); return; }

    // Find buyer's user_id from profiles
    const { data: buyerProfile } = await (supabase as any).from("public_profiles").select("user_id").eq("id", buyerId).maybeSingle();

    if (buyerProfile) {
      const title = status === "confirmed" ? "Reservation Accepted ✅" : "Reservation Declined";
      const message = status === "confirmed"
        ? `Your reservation request for "${propertyTitle}" has been accepted by the agent.`
        : `Your reservation request for "${propertyTitle}" was declined by the agent.`;
      await (supabase as any).from("notifications").insert({
        user_id: buyerProfile.user_id,
        title,
        message,
        type: status === "confirmed" ? "success" : "error",
        link: "/buyer-dashboard",
      });
    }

    toast.success(status === "confirmed" ? "Reservation accepted" : "Reservation declined");
    setReservations((prev) => prev.map((r) => r.id === resId ? { ...r, status } : r));
  };

  const statusColors: Record<string, string> = {
    available: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    for_sale: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
    for_rent: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
    draft: "bg-muted text-muted-foreground",
    under_verification: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    sold: "bg-muted text-muted-foreground",
    rented: "bg-muted text-muted-foreground",
  };

  const resStatusColors: Record<string, string> = {
    pending: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    confirmed: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const statCards = [
    { icon: Building, label: "My Listings", value: String(stats.listings) },
    { icon: TrendingUp, label: "Completed Sales", value: String(stats.deals) },
    { icon: CalendarCheck, label: "Reservations", value: String(reservations.length) },
    { icon: Star, label: "Trust Score", value: String(profile?.trust_score ?? 0) },
    { icon: Wallet, label: "Withdrawable", value: `₦${(wallet?.balance ?? 0).toLocaleString()}` },
    { icon: ShieldCheck, label: "In Escrow", value: `₦${(wallet?.escrow_balance ?? 0).toLocaleString()}` },
  ];

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {/* Premium header */}
        <header className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-secondary/40 bg-muted sm:h-16 sm:w-16">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile?.full_name || "Agent"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-xl font-bold text-primary">{firstName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {profile?.kyc_verified && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                    <VerifiedBadge size="sm" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{greeting}</p>
                <h1 className="truncate font-display text-2xl font-bold text-foreground sm:text-3xl">{firstName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {profile?.kyc_verified && (
                    <Badge className="bg-[hsl(var(--success)/0.15)] text-[10px] text-[hsl(var(--success))] sm:text-xs">Verified Agent</Badge>
                  )}
                  <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
                    <Star className="h-3 w-3 text-secondary" /> Trust {profile?.trust_score ?? 0}
                  </Badge>
                  <Badge
                    className={`text-[10px] sm:text-xs ${
                      subActive
                        ? "bg-primary/15 text-primary"
                        : "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"
                    }`}
                  >
                    {subActive ? `Subscription Active · ${daysRemaining}d` : "Subscription Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Link to="/add-property" className="w-full sm:w-auto">
                <Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </Link>
              <Link to="/earnings" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full gap-2">
                  <DollarSign className="h-4 w-4" /> Earnings
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {loadingStats
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-border bg-muted/40" />
              ))
            : statCards.map((c) => (
                <div
                  key={c.label}
                  className="flex h-[104px] flex-col justify-between rounded-2xl border border-border bg-card p-3 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-secondary/40 sm:p-4"
                >
                  <c.icon className="h-4 w-4 shrink-0 text-secondary" />
                  <p className="truncate font-display text-lg font-bold leading-tight text-foreground sm:text-xl">{c.value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
        </div>

        {/* Wallet Panel */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-foreground">Wallet</h2>
            <Link to="/earnings">
              <Button size="sm" variant="outline" className="gap-1">
                <DollarSign className="h-4 w-4" /> Withdraw
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 shadow-card">
              <Wallet className="mb-2 h-5 w-5 text-secondary" />
              <p className="break-words font-display text-2xl font-bold">₦{(wallet?.balance ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Available for withdrawal</p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-card">
              <ShieldCheck className="mb-2 h-5 w-5 text-secondary" />
              <p className="break-words font-display text-2xl font-bold">₦{(wallet?.escrow_balance ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Held in escrow</p>
            </div>
          </div>
        </section>

        {/* Secure Transactions */}
        <section className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Secure Transactions</h2>
          <SecureTransactions role="agent" />
        </section>


        {/* Reservations */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Reservations</h2>
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No reservation requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{r.properties?.title || "Property"}</p>
                        <Badge className={`text-xs ${resStatusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                          {r.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <p className="text-muted-foreground">Buyer: <span className="text-foreground font-medium">{r.buyer_name || "—"}</span></p>
                        <p className="text-muted-foreground">Viewing: <span className="text-foreground font-medium">{r.viewing_date ? new Date(r.viewing_date).toLocaleDateString() : "—"}</span></p>
                      </div>
                      {r.message && <p className="mt-2 text-sm text-muted-foreground italic">"{r.message}"</p>}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          disabled={updatingResId === r.id}
                          onClick={() => handleReservation(r.id, "confirmed", r.buyer_id, r.properties?.title)}
                          className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1"
                        >
                          <CheckCircle className="h-4 w-4" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingResId === r.id}
                          onClick={() => handleReservation(r.id, "rejected", r.buyer_id, r.properties?.title)}
                          className="gap-1"
                        >
                          <XCircle className="h-4 w-4" /> Decline
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 shrink-0"
                      onClick={async () => {
                        // Find or create chat thread for this reservation
                        const { data: thread } = await supabase
                          .from("chat_threads")
                          .select("id")
                          .eq("buyer_id", r.buyer_id)
                          .eq("agent_id", profile!.id)
                          .eq("property_id", r.property_id)
                          .maybeSingle();
                        if (thread) {
                          navigate(`/chat/${thread.id}`);
                        } else {
                          const { data: newThread } = await supabase
                            .from("chat_threads")
                            .insert({ buyer_id: r.buyer_id, agent_id: profile!.id, property_id: r.property_id })
                            .select("id")
                            .single();
                          if (newThread) navigate(`/chat/${newThread.id}`);
                          else toast.error("Failed to start chat");
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4" /> Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Listings */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-foreground">My Listings</h2>
            <Link to="/add-property">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">+ Add Property</Button>
            </Link>
          </div>
          {properties.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
              <Building className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No listings yet</p>
              <p className="text-sm text-muted-foreground mb-4">Start adding properties to build your portfolio</p>
              <Link to="/add-property">
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">+ Add First Property</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {properties.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                  <div className="h-36 bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{p.title}</p>
                      <Badge className={`text-xs shrink-0 ${statusColors[p.status] || "bg-muted text-muted-foreground"}`}>
                        {p.status?.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-secondary font-bold">₦{p.price?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1"
                        disabled={deletingId === p.id || p.status === "sold" || p.status === "rented"}
                        onClick={() => deleteProperty(p.id, p.status)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default AgentDashboard;
