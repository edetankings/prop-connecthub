import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import SecureTransactions from "@/components/SecureTransactions";
import { ShieldCheck, Clock, CheckCircle2, Wallet } from "lucide-react";

const Stat = ({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: string }) => (
  <div className="rounded-2xl border bg-card p-4 shadow-card">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold break-words">{value}</p>
      </div>
      <div className={`shrink-0 rounded-xl p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
    </div>
  </div>
);

const BuyerSecurePayments = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, secured: 0, completed: 0, totalSpent: 0 });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("transactions")
        .select("payment_status,total_payable")
        .eq("buyer_id", user.id);
      const rows = data || [];
      setStats({
        active: rows.filter((r: any) => ["pending_payment", "under_review"].includes(r.payment_status)).length,
        secured: rows.filter((r: any) => r.payment_status === "secured").length,
        completed: rows.filter((r: any) => r.payment_status === "released").length,
        totalSpent: rows
          .filter((r: any) => ["secured", "released"].includes(r.payment_status))
          .reduce((s: number, r: any) => s + (r.total_payable || 0), 0),
      });
    })();
  }, [user?.id]);

  const total = useMemo(() => `₦${stats.totalSpent.toLocaleString()}`, [stats.totalSpent]);

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">My Secure Payments</h1>
          <p className="text-sm text-muted-foreground">
            Every payment is held safely in escrow until you confirm delivery of the property.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Active" value={String(stats.active)} icon={Clock} tone="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" />
          <Stat label="In Escrow" value={String(stats.secured)} icon={ShieldCheck} tone="bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]" />
          <Stat label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" />
          <Stat label="Total Secured" value={total} icon={Wallet} tone="bg-primary/15 text-primary" />
        </div>

        <div className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold">Transaction History</h2>
          <SecureTransactions role="buyer" />
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default BuyerSecurePayments;
