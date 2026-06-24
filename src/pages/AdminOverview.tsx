import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, AlertTriangle, Wallet, Users, Building, Handshake, RefreshCw, Activity, DollarSign,
} from "lucide-react";

const Stat = ({ label, value, icon: Icon, tone, to }: any) => {
  const inner = (
    <div className="rounded-2xl border bg-card p-4 shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold break-words">{value}</p>
        </div>
        <div className={`shrink-0 rounded-xl p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState({
    users: 0, agents: 0, properties: 0, listingsLive: 0, listingsPending: 0,
    txActive: 0, txSecured: 0, txReleased: 0, escrowTotal: 0, companyBalance: 0,
    disputesOpen: 0, withdrawalsPending: 0, dealsPending: 0, salesVolume: 0,
  });
  const [activity, setActivity] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const [
      users, agents, props, propsLive, propsPending,
      txActive, txSecured, txReleased, escrow, company,
      disputes, withdrawals, deals, salesAgg, recentTx,
    ] = await Promise.all([
      sb.from("profiles").select("*", { count: "exact", head: true }),
      sb.from("profiles").select("*", { count: "exact", head: true }).eq("profile_type", "agent"),
      sb.from("properties").select("*", { count: "exact", head: true }),
      sb.from("properties").select("*", { count: "exact", head: true }).in("status", ["available", "for_sale", "for_rent"]),
      sb.from("properties").select("*", { count: "exact", head: true }).eq("status", "under_verification"),
      sb.from("transactions").select("*", { count: "exact", head: true }).in("payment_status", ["pending_payment", "under_review"]),
      sb.from("transactions").select("*", { count: "exact", head: true }).eq("payment_status", "secured"),
      sb.from("transactions").select("*", { count: "exact", head: true }).eq("payment_status", "released"),
      sb.from("wallets").select("escrow_balance"),
      sb.from("company_wallet").select("balance,total_earned").limit(1).maybeSingle(),
      sb.from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      sb.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("deal_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("transactions").select("total_payable,payment_status").in("payment_status", ["secured", "released"]),
      sb.from("transactions")
        .select("id,total_payable,payment_status,property_code,created_at,properties(title)")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const escrowTotal = (escrow.data || []).reduce((sum: number, w: any) => sum + (w.escrow_balance || 0), 0);
    const salesVolume = (salesAgg.data || []).reduce((sum: number, t: any) => sum + (t.total_payable || 0), 0);

    setS({
      users: users.count || 0,
      agents: agents.count || 0,
      properties: props.count || 0,
      listingsLive: propsLive.count || 0,
      listingsPending: propsPending.count || 0,
      txActive: txActive.count || 0,
      txSecured: txSecured.count || 0,
      txReleased: txReleased.count || 0,
      escrowTotal,
      companyBalance: company.data?.balance || 0,
      disputesOpen: disputes.count || 0,
      withdrawalsPending: withdrawals.count || 0,
      dealsPending: deals.count || 0,
      salesVolume,
    });
    setActivity(recentTx.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const naira = (n: number) => `₦${(n || 0).toLocaleString()}`;

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Platform Overview</h1>
            <p className="text-sm text-muted-foreground">Real-time pulse of the Prop-Connect marketplace.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Loading metrics…</div>
        ) : (
          <>
            {/* Money */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Stat label="Funds in Escrow" value={naira(s.escrowTotal)} icon={ShieldCheck} tone="bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]" />
              <Stat label="Company Wallet" value={naira(s.companyBalance)} icon={Wallet} tone="bg-primary/15 text-primary" />
              <Stat label="Sales Volume" value={naira(s.salesVolume)} icon={DollarSign} tone="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" />
              <Stat label="Released" value={String(s.txReleased)} icon={Activity} tone="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" to="/admin/secure-payments" />
            </div>

            {/* Operational queues */}
            <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Action Required</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Stat label="Pending Listings" value={String(s.listingsPending)} icon={Building} tone="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" to="/admin/properties" />
              <Stat label="Active Payments" value={String(s.txActive)} icon={ShieldCheck} tone="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" to="/admin/secure-payments" />
              <Stat label="Open Disputes" value={String(s.disputesOpen)} icon={AlertTriangle} tone="bg-destructive/10 text-destructive" to="/admin/disputes" />
              <Stat label="Withdrawals" value={String(s.withdrawalsPending)} icon={Wallet} tone="bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]" to="/admin/withdrawals" />
            </div>

            {/* Marketplace */}
            <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Marketplace</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Stat label="Total Users" value={String(s.users)} icon={Users} tone="bg-muted text-foreground" />
              <Stat label="Agents" value={String(s.agents)} icon={Users} tone="bg-muted text-foreground" />
              <Stat label="Live Listings" value={String(s.listingsLive)} icon={Building} tone="bg-muted text-foreground" to="/admin/properties" />
              <Stat label="Pending Deals" value={String(s.dealsPending)} icon={Handshake} tone="bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]" />
            </div>

            {/* Recent transactions */}
            <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Recent Transactions</h2>
            {activity.length === 0 ? (
              <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="space-y-2">
                {activity.map((tx) => (
                  <Link
                    key={tx.id}
                    to="/admin/secure-payments"
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-card hover:shadow-elevated"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{tx.properties?.title || "Property"}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.property_code || tx.id.slice(0, 8)} · {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {tx.payment_status?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-semibold">{naira(tx.total_payable)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminOverview;
