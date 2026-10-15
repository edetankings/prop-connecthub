import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Search,
  BookmarkCheck,
  MapPin,
  Bed,
  Bath,
  CalendarCheck,
  Eye,
  ShieldCheck,
  Wallet,
  Compass,
  UserCircle2,
  Hash,
  SlidersHorizontal,
  Star,
  Clock,
  ArrowRight,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import SecureTransactions from "@/components/SecureTransactions";
import EmptyState from "@/components/buyer/EmptyState";
import BottomNav from "@/components/buyer/BottomNav";
import AIAssistantFab from "@/components/buyer/AIAssistantFab";

const statusColors: Record<string, string> = {
  pending: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  confirmed: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
};

const quickActions = [
  { label: "Browse Properties", icon: Compass, to: "/properties", tint: "bg-primary/10 text-primary" },
  { label: "Search by ID", icon: Hash, to: "/properties", tint: "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]" },
  { label: "My Reservations", icon: BookmarkCheck, to: "#reservations", tint: "bg-secondary/15 text-secondary" },
  { label: "Saved Properties", icon: Heart, to: "/properties", tint: "bg-destructive/10 text-destructive" },
  { label: "Secure Payments", icon: ShieldCheck, to: "/dashboard/buyer/secure-payments", tint: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
  { label: "Recent Chats", icon: MessageCircle, to: "/messages", tint: "bg-primary/10 text-primary" },
  { label: "Nearby Homes", icon: MapPin, to: "/properties", tint: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  { label: "Profile", icon: UserCircle2, to: "/settings", tint: "bg-muted text-foreground" },
];

const naira = (n?: number | null) => `₦${Number(n || 0).toLocaleString()}`;

const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-muted/60 ${className}`} />
);

const BuyerDashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reservations: 0, messages: 0, viewings: 0 });

  // search card state (UI only — hands off to /properties)
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [propType, setPropType] = useState("");
  const [beds, setBeds] = useState("");

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const recentlyViewed = useMemo(() => {
    try {
      const raw = localStorage.getItem("pc_recently_viewed");
      return raw ? (JSON.parse(raw) as any[]).slice(0, 8) : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);

    (supabase as any)
      .from("reservations")
      .select("*, properties(title, city, state, price, image_url, property_code)")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setReservations(data || []);
        setStats((s) => ({
          ...s,
          reservations: data?.length || 0,
          viewings: (data || []).filter((r: any) => r.viewing_date).length,
        }));
        setLoading(false);
      });

    supabase
      .from("chat_threads")
      .select("*, messages(content, created_at, seen, sender_id)")
      .eq("buyer_id", profile.id)
      .order("last_message_at", { ascending: false })
      .limit(5)
      .then(async ({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        const enriched = await Promise.all((data || []).map(async (thread) => {
          const { data: participants } = await supabase.rpc("get_chat_participants", { _thread_id: thread.id });
          return { ...thread, agent: participants?.find((p) => p.id === thread.agent_id) };
        }));
        setThreads(enriched);
        const unread = (data || []).reduce((acc: number, t: any) => {
          const msgs = t.messages || [];
          return acc + msgs.filter((m: any) => !m.seen && m.sender_id !== profile.id).length;
        }, 0);
        setStats((s) => ({ ...s, messages: unread }));
      });

    supabase
      .from("properties")
      .select("*")
      .eq("status", "available")
      .limit(8)
      .then(({ data }) => setRecommended(data || []));
  }, [profile?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("transactions")
      .select("amount, payment_status")
      .eq("buyer_id", user.id)
      .then(({ data }: any) => setTxns(data || []));
  }, [user?.id]);

  const wallet = useMemo(() => {
    const sum = (fn: (t: any) => boolean) =>
      txns.filter(fn).reduce((a, t) => a + Number(t.amount || 0), 0);
    return {
      escrow: sum((t) => ["secured", "under_review"].includes(t.payment_status)),
      refunds: sum((t) => t.payment_status === "refunded"),
      total: sum(() => true),
      count: txns.length,
    };
  }, [txns]);

  const timeline = useMemo(() => {
    const events: { label: string; detail: string; at: string; tint: string }[] = [];
    reservations.slice(0, 4).forEach((r) =>
      events.push({
        label: "Reservation created",
        detail: r.properties?.title || "Property",
        at: r.created_at,
        tint: "bg-primary",
      })
    );
    threads.slice(0, 3).forEach((t) => {
      const last = (t.messages || []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      if (last)
        events.push({
          label: "Agent replied",
          detail: t.agent?.full_name || "Agent",
          at: last.created_at,
          tint: "bg-secondary",
        });
    });
    if (profile?.kyc_verified)
      events.push({
        label: "Verification completed",
        detail: "Identity verified",
        at: new Date().toISOString(),
        tint: "bg-[hsl(var(--success))]",
      });
    return events
      .filter((e) => e.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [reservations, threads, profile?.kyc_verified]);

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("city", location);
    if (priceRange) params.set("price", priceRange);
    if (propType) params.set("type", propType);
    if (beds) params.set("beds", beds);
    navigate(`/properties${params.toString() ? `?${params}` : ""}`);
  };

  const statCards = [
    { label: "Reservations", value: stats.reservations, hint: "Active", icon: BookmarkCheck, tint: "bg-primary/10 text-primary" },
    { label: "Saved Properties", value: 0, hint: "View list", icon: Heart, tint: "bg-destructive/10 text-destructive" },
    { label: "Messages", value: stats.messages, hint: "Unread", icon: MessageCircle, tint: "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]" },
    { label: "Viewing Requests", value: stats.viewings, hint: "Scheduled", icon: Eye, tint: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  ];

  return (
    <AuthenticatedLayout>
      <div className="mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-12">
        {/* Greeting hero */}
        <section className="animate-fade-in mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-hero p-5 text-primary-foreground shadow-elevated sm:p-8">
          <p className="text-sm/relaxed opacity-90">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold sm:text-4xl">Hello, {firstName}! 👋</h1>
          <p className="mt-1 text-sm opacity-90">Find your dream home today</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile?.kyc_verified ? "Verified Buyer" : "Unverified Buyer"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <Star className="h-3.5 w-3.5" />
              Trust Score {profile?.trust_score ?? 0}%
            </span>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-28" />)
            : statCards.map((c) => (
                <div
                  key={c.label}
                  className="animate-fade-in flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.tint}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">{c.value}</p>
                  <p className="text-xs font-medium text-foreground/80">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                </div>
              ))}
        </section>

        {/* Search card */}
        <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search by location, property ID, agent, city..."
                className="h-11 rounded-xl pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={runSearch} className="h-11 flex-1 rounded-xl px-6 sm:flex-none">
                Search
              </Button>
              <Button variant="outline" onClick={runSearch} className="h-11 rounded-xl" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                {["Lagos", "Abuja", "Port Harcourt", "Asaba", "Warri"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Price" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0-20000000">Under ₦20M</SelectItem>
                <SelectItem value="20000000-50000000">₦20M – ₦50M</SelectItem>
                <SelectItem value="50000000-100000000">₦50M – ₦100M</SelectItem>
                <SelectItem value="100000000-999999999">₦100M+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={propType} onValueChange={setPropType}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {["House", "Apartment", "Duplex", "Land", "Commercial"].map((t) => (
                  <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={beds} onValueChange={setBeds}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Bedrooms" /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5"].map((b) => (
                  <SelectItem key={b} value={b}>{b}+ Bedrooms</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.tint}`}>
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recommended */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Recommended for You</h2>
            <Link to="/properties" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-64" />)}
            </div>
          ) : recommended.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-7 w-7" />}
              title="No properties yet"
              description="New verified listings will appear here as soon as they are approved."
              actionLabel="Browse Properties"
              to="/properties"
            />
          ) : (
            <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {recommended.map((p) => (
                <div
                  key={p.id}
                  className="group w-[78vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated sm:w-auto"
                >
                  <Link to={`/property/${p.id}`} className="block">
                    <div className="relative h-40 bg-muted">
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[10px] font-semibold text-[hsl(var(--success))] backdrop-blur">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                      <button
                        onClick={(e) => e.preventDefault()}
                        aria-label="Save property"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-transform hover:scale-110"
                      >
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </Link>
                  <div className="p-4">
                    <p className="font-display text-base font-bold text-foreground">{naira(p.price)}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{p.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {p.city}, {p.state}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms} bd</span>}
                      {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms} ba</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge className="bg-[hsl(var(--success)/0.15)] text-[10px] text-[hsl(var(--success))]">
                        Trust {p.trust_score ?? 90}%
                      </Badge>
                      <Button asChild size="sm" variant="outline" className="ml-auto h-8 rounded-full text-xs">
                        <Link to={`/property/${p.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Two column: reservations + secure transactions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section id="reservations">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">My Reservations</h2>
            {loading ? (
              <CardSkeleton className="h-40" />
            ) : reservations.length === 0 ? (
              <EmptyState
                icon={<BookmarkCheck className="h-7 w-7" />}
                title="No reservations yet."
                description="Reserve a verified property to schedule a viewing and start a secure deal."
                actionLabel="Browse Properties"
                to="/properties"
              />
            ) : (
              <div className="space-y-3">
                {reservations.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {r.properties?.image_url && (
                          <img src={r.properties.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{r.properties?.title}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {r.properties?.city}, {r.properties?.state}
                        </p>
                        {r.properties?.property_code && (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.properties.property_code}</p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-primary">{naira(r.properties?.price)}</p>
                      </div>
                      <Badge className={`h-fit text-[10px] ${statusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {r.viewing_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarCheck className="h-3 w-3" />
                          {new Date(r.viewing_date).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-8 gap-1 rounded-full text-xs"
                        onClick={async () => {
                          const { data: thread } = await supabase
                            .from("chat_threads")
                            .select("id")
                            .eq("buyer_id", profile!.id)
                            .eq("property_id", r.property_id)
                            .maybeSingle();
                          if (thread) {
                            navigate(`/chat/${thread.id}`);
                          } else {
                            const { data: newThread } = await supabase
                              .from("chat_threads")
                              .insert({ buyer_id: profile!.id, agent_id: r.agent_id, property_id: r.property_id })
                              .select("id")
                              .single();
                            if (newThread) navigate(`/chat/${newThread.id}`);
                          }
                        }}
                      >
                        <MessageCircle className="h-3 w-3" /> Chat
                      </Button>
                      <Button asChild size="sm" className="h-8 rounded-full text-xs">
                        <Link to={`/property/${r.property_id}`}>View Reservation</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Secure Transactions</h2>
              <Link to="/dashboard/buyer/secure-payments" className="text-sm font-medium text-primary hover:underline">
                View All
              </Link>
            </div>
            {txns.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-7 w-7" />}
                title="No secure transactions."
                description="Funds are held safely in escrow until you confirm handover."
                actionLabel="Learn How Secure Payments Work"
                to="/dashboard/buyer/secure-payments"
              />
            ) : (
              <SecureTransactions role="buyer" />
            )}
          </section>
        </div>

        {/* Wallet + chats */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-1">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Buyer Wallet</h2>
            <div className="rounded-2xl border border-border bg-gradient-hero p-5 text-primary-foreground shadow-elevated">
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Wallet className="h-4 w-4" /> Total Transacted
              </div>
              <p className="mt-1 font-display text-3xl font-bold">{naira(wallet.total)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "In Escrow", v: naira(wallet.escrow) },
                  { l: "Refunds", v: naira(wallet.refunds) },
                  { l: "Transactions", v: String(wallet.count) },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-primary-foreground/10 p-2 backdrop-blur">
                    <p className="truncate text-xs font-semibold">{x.v}</p>
                    <p className="text-[10px] opacity-80">{x.l}</p>
                  </div>
                ))}
              </div>
              <Button asChild variant="secondary" size="sm" className="mt-4 w-full rounded-full">
                <Link to="/dashboard/buyer/secure-payments">View Wallet</Link>
              </Button>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Recent Chats</h2>
              <Link to="/messages" className="text-sm font-medium text-primary hover:underline">View All</Link>
            </div>
            {threads.length === 0 ? (
              <EmptyState
                icon={<MessageCircle className="h-7 w-7" />}
                title="No conversations yet"
                description="Start a chat with a verified agent about a property you like."
                actionLabel="Find an Agent"
                to="/agents"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {threads.map((t) => {
                  const lastMsg = (t.messages || []).sort(
                    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )[0];
                  const unread = (t.messages || []).filter((m: any) => !m.seen).length;
                  return (
                    <Link
                      key={t.id}
                      to={`/chat/${t.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                          {t.agent?.full_name?.[0] || "A"}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-[hsl(var(--success))]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-foreground">{t.agent?.full_name || "Agent"}</p>
                          {lastMsg?.created_at && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(lastMsg.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{lastMsg?.content || "No messages yet"}</p>
                      </div>
                      {unread > 0 && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                          {unread}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Recently viewed */}
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Recently Viewed</h2>
          {recentlyViewed.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-7 w-7" />}
              title="Nothing viewed yet"
              description="Properties you open will show up here so you can pick up where you left off."
              actionLabel="Start Browsing"
              to="/properties"
            />
          ) : (
            <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
              {recentlyViewed.map((p: any) => (
                <div key={p.id} className="w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  <div className="h-28 bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="font-display text-sm font-bold text-foreground">{naira(p.price)}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.city}</p>
                    <Button asChild size="sm" variant="outline" className="mt-2 h-8 w-full rounded-full text-xs">
                      <Link to={`/property/${p.id}`}>View Again</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity timeline */}
        <section className="mb-6">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Activity Timeline</h2>
          {timeline.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-7 w-7" />}
              title="No activity yet"
              description="Your reservations, chats and payments will appear here."
              actionLabel="Explore Properties"
              to="/properties"
            />
          ) : (
            <ol className="relative space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              {timeline.map((e, i) => (
                <li key={i} className="relative flex gap-3 pl-4">
                  <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${e.tint}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{e.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(e.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <Link
          to="/properties"
          className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-elevated"
        >
          <span className="text-sm font-medium text-foreground">Discover more verified homes near you</span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      </div>

      <AIAssistantFab />
      <BottomNav />
    </AuthenticatedLayout>
  );
};

export default BuyerDashboard;
