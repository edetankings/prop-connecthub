import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Building, MessageCircle, Star, Wallet, TrendingUp, ShieldCheck, Trash2, CalendarCheck,
  CheckCircle, XCircle, DollarSign, ArrowRight, ArrowUpRight, Eye, EyeOff, ChevronRight,
  Users, Network, BarChart3, Receipt, Megaphone, Activity, Bell, FileCheck,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import SecureTransactions from "@/components/SecureTransactions";
import WithdrawDialog from "@/components/WithdrawDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import walletArt from "@/assets/wallet-3d.png";
import agentsArt from "@/assets/agents-banner.png";

const naira = (n: number) => `₦${(n || 0).toLocaleString()}`;

const AgentDashboard = () => {
  const { user, profile } = useAuth();
  const { isActive: subActive, daysRemaining } = useSubscription();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; escrow_balance: number } | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingResId, setUpdatingResId] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] || "Agent";

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from("properties")
      .select("*")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProperties(data || []));

    supabase
      .from("wallets")
      .select("balance, escrow_balance")
      .eq("user_id", profile.user_id)
      .maybeSingle()
      .then(({ data }) => setWallet(data));

    (supabase as any)
      .from("reservations")
      .select("*, properties(title, image_url, city, state, price)")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setReservations(data || []);
        setLoadingStats(false);
      });

    (supabase as any)
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }: any) => setAnnouncements(data || []));
  }, [profile?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("earnings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setEarnings(data || []));

    (supabase as any)
      .from("transactions")
      .select("id, property_code, total_payable, payment_status, created_at, property_id")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setTransactions(data || []));
  }, [user?.id]);

  /* ---------- derived (frontend-only calculations from existing data) ---------- */
  const secureSales = useMemo(
    () => earnings.filter((e) => e.type === "sale_payout").reduce((s, e) => s + Number(e.amount || 0), 0),
    [earnings]
  );
  const referralIncome = useMemo(
    () => earnings.filter((e) => e.type === "direct_referral").reduce((s, e) => s + (e.amount || 0), 0),
    [earnings]
  );
  const matrixIncome = useMemo(
    () => earnings.filter((e) => e.type === "matrix").reduce((s, e) => s + (e.amount || 0), 0),
    [earnings]
  );
  const totalEarnings = secureSales + referralIncome + matrixIncome;

  const monthly = useMemo(() => {
    const months: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: "short" }),
        value: 0,
      });
    }
    const add = (dateStr: string, amount: number) => {
      const d = new Date(dateStr);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === k);
      if (m) m.value += amount || 0;
    };
    earnings.forEach((e) => add(e.created_at, e.amount));
    // Sale payouts are already included in the earning ledger above.
    return months;
  }, [earnings, transactions]);

  const thisMonth = monthly[monthly.length - 1]?.value || 0;
  const lastMonth = monthly[monthly.length - 2]?.value || 0;
  const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

  const sources = [
    { name: "Secure Sales", value: secureSales, color: "hsl(var(--primary))" },
    { name: "Referrals", value: referralIncome, color: "hsl(var(--info))" },
    { name: "Matrix", value: matrixIncome, color: "hsl(var(--warning))" },
  ];
  const sourcesTotal = sources.reduce((s, x) => s + x.value, 0);
  const pieData = sourcesTotal > 0 ? sources : [{ name: "No earnings", value: 1, color: "hsl(var(--muted))" }];

  const pendingReservations = reservations.filter((r) => r.status === "pending").length;

  /* ---------- actions (unchanged logic) ---------- */
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
    }
  };

  const handleReservation = async (resId: string, status: "confirmed" | "rejected", buyerId: string, propertyTitle: string) => {
    setUpdatingResId(resId);
    const { error } = await (supabase as any).rpc("agent_respond_inspection", {
      _id: resId, _action: status === "confirmed" ? "confirm" : "decline",
      _note: null, _date: null, _time: null,
    });
    setUpdatingResId(null);
    if (error) { toast.error(error.message); return; }

    toast.success(status === "confirmed" ? "Reservation accepted" : "Reservation declined");
    setReservations((prev) => prev.map((r) => r.id === resId ? { ...r, status } : r));
  };

  const openChat = async (r: any) => {
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("buyer_id", r.buyer_id)
      .eq("agent_id", profile!.id)
      .eq("property_id", r.property_id)
      .maybeSingle();
    if (thread) { navigate(`/chat/${thread.id}`); return; }
    toast.info("The buyer must start the conversation before the agent can reply.");
  };

  /* ---------- styles ---------- */
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
  const txStatusColors: Record<string, string> = {
    pending_payment: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    under_review: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
    secured: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    released: "bg-primary/15 text-primary",
    refunded: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/10 text-destructive",
  };

  const statCards = [
    {
      label: "Total Earnings", value: naira(totalEarnings), icon: DollarSign,
      sub: `${growth >= 0 ? "↗" : "↘"} ${Math.abs(growth).toFixed(1)}% this month`,
      tint: "from-[hsl(var(--success)/0.14)] to-[hsl(var(--success)/0.04)]", accent: "text-[hsl(var(--success))]",
    },
    {
      label: "My Listings", value: String(properties.length), icon: Building,
      sub: "Active Listings", tint: "from-[hsl(var(--info)/0.14)] to-[hsl(var(--info)/0.04)]", accent: "text-[hsl(var(--info))]",
    },
    {
      label: "Trust Score", value: String(profile?.trust_score ?? 0), icon: Star,
      sub: (profile?.trust_score ?? 0) >= 80 ? "★ Excellent" : (profile?.trust_score ?? 0) >= 50 ? "★ Good" : "★ Building",
      tint: "from-primary/12 to-primary/[0.03]", accent: "text-primary",
    },
    {
      label: "Reservations", value: String(pendingReservations), icon: CalendarCheck,
      sub: "Pending Requests", tint: "from-[hsl(var(--warning)/0.16)] to-[hsl(var(--warning)/0.04)]", accent: "text-[hsl(var(--warning))]",
    },
  ];

  const quickAccess = [
    { label: "Add Property", icon: Plus, to: "/add-property", tint: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" },
    { label: "Wallet", icon: Wallet, to: "/earnings", tint: "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]" },
    { label: "Transactions", icon: Receipt, to: "/payments", tint: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]" },
    { label: "Reservations", icon: CalendarCheck, to: "#reservations", tint: "bg-primary/12 text-primary" },
    { label: "Earnings", icon: TrendingUp, to: "/earnings", tint: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" },
    { label: "Referrals", icon: Users, to: "/earnings", tint: "bg-destructive/10 text-destructive" },
    { label: "Matrix", icon: Network, to: "/earnings", tint: "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]" },
    { label: "Analytics", icon: BarChart3, to: "/analytics", tint: "bg-primary/12 text-primary" },
    { label: "Withdraw", icon: ArrowUpRight, to: "/earnings", tint: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]" },
  ];

  const activityIcon: Record<string, any> = {
    success: CheckCircle, error: XCircle, warning: Bell, info: Activity, kyc: FileCheck, message: MessageCircle,
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const card = "rounded-2xl border border-border bg-card shadow-card";

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto max-w-7xl px-3 py-5 sm:px-5 sm:py-7">
          {/* Page heading */}
          <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">Welcome back, {firstName}! 👋</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile?.kyc_verified && (
                <span className="flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.12)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">
                  <VerifiedBadge size="sm" /> Verified
                </span>
              )}
              <Badge className={subActive ? "bg-primary/15 text-primary" : "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"}>
                {subActive ? `Subscription · ${daysRemaining}d` : "Subscription Inactive"}
              </Badge>
              <Link to="/add-property">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </Link>
            </div>
          </header>

          {/* Stat cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {loadingStats
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[112px] animate-pulse rounded-2xl border border-border bg-muted/40" />
                ))
              : statCards.map((c) => (
                  <div key={c.label} className={`${card} bg-gradient-to-br ${c.tint} p-4 transition-transform duration-300 hover:-translate-y-0.5`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium ${c.accent}`}>{c.label}</p>
                      <c.icon className={`h-4 w-4 shrink-0 ${c.accent}`} />
                    </div>
                    <p className="mt-2 truncate font-display text-xl font-bold text-foreground sm:text-2xl">{c.value}</p>
                    <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{c.sub}</p>
                  </div>
                ))}
          </div>

          {/* Wallet + Quick access */}
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className={`${card} relative overflow-hidden bg-gradient-to-br from-[hsl(var(--success)/0.18)] via-primary/5 to-card lg:col-span-2`}>
              <div className="relative z-10 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Wallet Balance</p>
                    <button onClick={() => setShowBalance((v) => !v)} aria-label="Toggle balance visibility" className="text-muted-foreground hover:text-foreground">
                      {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 break-words font-display text-3xl font-bold text-foreground">
                    {showBalance ? naira(wallet?.balance ?? 0) : "₦ ••••"}
                  </p>
                  <p className="text-xs text-muted-foreground">Available for withdrawal</p>
                  <Button onClick={() => setWithdrawOpen(true)} className="mt-4 gap-2">
                    Withdraw Funds <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col justify-between border-t border-border/60 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">In Escrow</p>
                    </div>
                    <p className="mt-1 break-words font-display text-2xl font-bold text-foreground">
                      {showBalance ? naira(wallet?.escrow_balance ?? 0) : "₦ ••••"}
                    </p>
                    <p className="text-xs text-muted-foreground">Secured amount</p>
                  </div>
                  <img
                    src={walletArt}
                    alt="Wallet illustration"
                    loading="lazy"
                    width={768}
                    height={768}
                    className="ml-auto mt-3 h-24 w-24 object-contain sm:h-32 sm:w-32"
                  />
                </div>
              </div>
            </div>

            <div className={`${card} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-foreground">Quick Access</h2>
                <Link to="/settings" className="text-xs font-medium text-primary hover:underline">All Tools</Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {quickAccess.map((q) => (
                  <Link
                    key={q.label}
                    to={q.to}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-colors hover:bg-muted/60"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${q.tint} transition-transform group-hover:scale-105`}>
                      <q.icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{q.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions + Announcements/Activity */}
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className={`${card} lg:col-span-2`}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-bold text-foreground">Recent Secure Transactions</h2>
                <Link to="/payments" className="text-xs font-medium text-primary hover:underline">View all</Link>
              </div>
              {transactions.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No secure transactions yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.slice(0, 3).map((tx) => (
                    <Link
                      key={tx.id}
                      to={tx.property_id ? `/property/${tx.property_id}` : "/payments"}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]">
                        <Receipt className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-semibold text-foreground sm:text-sm">
                          {tx.property_code || tx.id.slice(0, 8).toUpperCase()}
                        </p>
                        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{naira(tx.total_payable)}</span>
                          <Badge className={`w-fit text-[9px] ${txStatusColors[tx.payment_status] || "bg-muted text-muted-foreground"}`}>
                            {tx.payment_status?.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          <span className="truncate text-right sm:text-left">{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
              <Link to="/payments" className="flex items-center justify-center gap-1 border-t border-border py-3 text-xs font-medium text-primary hover:underline">
                View all transactions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-4">
              {/* Announcements */}
              <div className={card}>
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                    <Megaphone className="h-4 w-4 text-primary" /> Announcements
                  </h2>
                  <Link to="/announcements" className="text-xs font-medium text-primary hover:underline">View all</Link>
                </div>
                {announcements.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No announcements yet.</p>
                ) : (
                  <ul className="space-y-2 p-4">
                    {announcements.map((a, i) => (
                      <li key={a.id} className={`rounded-xl p-3 ${i === 0 ? "bg-[hsl(var(--success)/0.08)]" : "bg-muted/40"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{a.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recent Activity */}
              <div className={card}>
                <div className="border-b border-border px-5 py-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                    <Activity className="h-4 w-4 text-primary" /> Recent Activity
                  </h2>
                </div>
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  <ul className="space-y-3 p-4">
                    {notifications.slice(0, 4).map((n) => {
                      const Icon = activityIcon[n.type] || Activity;
                      return (
                        <li key={n.id} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                              <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className={`${card} p-5 lg:col-span-2`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Earnings Overview</h2>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">{naira(totalEarnings)}</p>
                  <p className={`text-xs ${growth >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                    {growth >= 0 ? "↗" : "↘"} {Math.abs(growth).toFixed(1)}% vs last month
                  </p>
                </div>
                <Link to="/earnings" className="text-xs font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                      formatter={(v: any) => [naira(Number(v)), "Earnings"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#earnGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${card} p-5`}>
              <h2 className="font-display text-base font-bold text-foreground">Earnings Sources</h2>
              <p className="text-xs text-muted-foreground">All time</p>
              <div className="relative mx-auto mt-2 h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={2} stroke="none">
                      {pieData.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    {sourcesTotal > 0 && (
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                        formatter={(v: any, n: any) => [naira(Number(v)), n]}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display text-base font-bold text-foreground">{naira(sourcesTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">Total Earnings</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {sources.map((s) => (
                  <li key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                    </span>
                    <span className="font-semibold text-foreground">
                      {sourcesTotal > 0 ? `${Math.round((s.value / sourcesTotal) * 100)}%` : "0%"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Secure transactions (full, existing component with all actions) */}
          <section className="mb-5">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Secure Transactions</h2>
            <SecureTransactions role="agent" />
          </section>

          {/* Reservations */}
          <section id="reservations" className="mb-5 scroll-mt-20">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Reservations</h2>
            {reservations.length === 0 ? (
              <div className={`${card} p-8 text-center text-muted-foreground`}>No reservation requests yet.</div>
            ) : (
              <div className="space-y-3">
                {reservations.map((r) => (
                  <div key={r.id} className={`${card} p-4`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{r.properties?.title || "Property"}</p>
                          <Badge className={`text-xs ${resStatusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                            {r.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                          <p className="text-muted-foreground">Buyer: <span className="font-medium text-foreground">{r.buyer_name || "—"}</span></p>
                          <p className="text-muted-foreground">Viewing: <span className="font-medium text-foreground">{r.viewing_date ? new Date(r.viewing_date).toLocaleDateString() : "—"}</span></p>
                        </div>
                        {r.message && <p className="mt-2 text-sm italic text-muted-foreground">"{r.message}"</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 md:shrink-0">
                        {r.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              disabled={updatingResId === r.id}
                              onClick={() => handleReservation(r.id, "confirmed", r.buyer_id, r.properties?.title)}
                              className="gap-1 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90"
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
                          </>
                        )}
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openChat(r)}>
                          <MessageCircle className="h-4 w-4" /> Chat
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Listings */}
          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">My Listings</h2>
              <Link to="/add-property">
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Add Property</Button>
              </Link>
            </div>
            {properties.length === 0 ? (
              <div className={`${card} p-12 text-center`}>
                <Building className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No listings yet</p>
                <p className="mb-4 text-sm text-muted-foreground">Start adding properties to build your portfolio</p>
                <Link to="/add-property"><Button>+ Add First Property</Button></Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((p) => (
                  <div key={p.id} className={`${card} overflow-hidden`}>
                    <div className="h-36 bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-foreground">{p.title}</p>
                        <Badge className={`shrink-0 text-xs ${statusColors[p.status] || "bg-muted text-muted-foreground"}`}>
                          {p.status?.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm font-bold text-primary">{naira(p.price)}</p>
                      <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
          </section>

          {/* Bottom banner */}
          <section className={`${card} overflow-hidden bg-gradient-to-r from-[hsl(var(--success)/0.16)] via-primary/5 to-card`}>
            <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:justify-between sm:p-6">
              <div className="text-center sm:text-left">
                <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">Get more clients and close more deals</h3>
                <p className="mt-1 text-sm text-muted-foreground">Add more properties to reach thousands of potential buyers</p>
                <Link to="/add-property">
                  <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add New Property</Button>
                </Link>
              </div>
              <img src={agentsArt} alt="Prop Connect agents" loading="lazy" width={1024} height={640} className="h-28 w-auto object-contain sm:h-36" />
            </div>
          </section>
        </div>
      </div>

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={wallet?.balance ?? 0}
        onSuccess={() => {
          setWithdrawOpen(false);
          if (profile?.user_id) {
            supabase
              .from("wallets")
              .select("balance, escrow_balance")
              .eq("user_id", profile.user_id)
              .maybeSingle()
              .then(({ data }) => setWallet(data));
          }
        }}
      />
    </AuthenticatedLayout>
  );
};

export default AgentDashboard;
