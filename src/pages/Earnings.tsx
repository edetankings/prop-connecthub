import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Copy, TrendingUp, Wallet, Clock, Layers, UserPlus, Building } from "lucide-react";
import { toast } from "sonner";
import WithdrawDialog from "@/components/WithdrawDialog";
import ReferralTree from "@/components/ReferralTree";

const Earnings = () => {
  const { user, profile } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [escrow, setEscrow] = useState<any[]>([]);
  const [subStatus, setSubStatus] = useState<{ status: string; end_date?: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawalReserved, setWithdrawalReserved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    loadData();
  }, [user?.id, profile?.id]);

  const loadData = async () => {
    setLoading(true);
    const [earningsRes, refsRes, wdRes, escrowRes, subRes, walletRes] = await Promise.all([
      (supabase as any).from("earnings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      (supabase as any).rpc("get_referral_summary"),
      (supabase as any).from("withdrawals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      (supabase as any).from("escrow_holds").select("*").eq("intended_user_id", user!.id).eq("status", "held"),
      (supabase as any).from("subscriptions").select("status, end_date").eq("user_id", user!.id).maybeSingle(),
      supabase.from("wallets").select("balance, withdrawal_reserved").eq("user_id", user!.id).maybeSingle(),
    ]);
    setWalletBalance(Number(walletRes.data?.balance ?? 0));
    setWithdrawalReserved(Number(walletRes.data?.withdrawal_reserved ?? 0));
    setEarnings(earningsRes.data || []);
    setReferrals(refsRes.data || []);
    setWithdrawals(wdRes.data || []);
    setEscrow(escrowRes.data || []);
    setSubStatus(subRes.data || null);
    setLoading(false);
  };

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const directEarnings = earnings.filter(e => e.type === "direct_referral").reduce((s, e) => s + (e.amount || 0), 0);
  const matrixEarnings = earnings.filter(e => e.type === "matrix").reduce((s, e) => s + (e.amount || 0), 0);
  const escrowTotal = escrow.reduce((s, e) => s + (e.amount || 0), 0);

  const totalCommittedWd = withdrawals
    .filter((w) => w.status === "approved" || w.status === "pending")
    .reduce((s, w) => s + (w.amount || 0), 0);
  const availableBalance = walletBalance;

  // Per-level breakdown (1-15)
  const levelBreakdown = Array.from({ length: 15 }, (_, i) => {
    const lvl = i + 1;
    const items = earnings.filter(e => e.level === lvl && (e.type === "matrix" || (lvl === 1 && e.type === "direct_referral")));
    const amount = items.reduce((s, e) => s + (e.amount || 0), 0);
    return { level: lvl, amount, count: items.length };
  });

  // Bi-weekly countdown
  const lastWithdrawal = withdrawals[0];
  const daysSince = lastWithdrawal ? Math.floor((Date.now() - new Date(lastWithdrawal.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const daysUntilNext = Math.max(0, 14 - daysSince);

  const referralLink = (profile as any)?.referral_code
    ? `${window.location.origin}/register?ref=${(profile as any).referral_code}`
    : null;

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    }
  };

  const isSubActive = subStatus?.status === "active" && subStatus.end_date && new Date(subStatus.end_date) >= new Date();

  const typeColors: Record<string, string> = {
    direct_referral: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    matrix: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    company_fee: "bg-muted text-muted-foreground",
  };
  const typeLabels: Record<string, string> = {
    direct_referral: "Direct Referral",
    matrix: "Matrix Earning",
    company_fee: "Company Log",
  };
  const wdStatusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Earnings & Network 💰</h1>
            <p className="mt-1 text-muted-foreground">Track your subscription income across 15 generations</p>
          </div>
          <Button onClick={() => setWithdrawOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Wallet className="h-4 w-4" /> Withdraw
          </Button>
        </div>

        {/* Subscription status banner */}
        <Card className={`mb-4 ${isSubActive ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-destructive/30 bg-destructive/5"}`}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Subscription Status</p>
              <p className={`font-display font-bold ${isSubActive ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
                {isSubActive ? "Active" : "Inactive — earnings go to escrow"}
              </p>
            </div>
            {!isSubActive && (
              <Button size="sm" variant="outline" onClick={() => window.location.href = "/payments"}>
                Subscribe (₦7,500)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Referral Link */}
        {referralLink && (
          <Card className="mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">Your Referral Link</p>
                <p className="text-xs text-muted-foreground truncate">{referralLink}</p>
              </div>
              <Button size="sm" onClick={copyLink} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                <Copy className="h-4 w-4" /> Copy Link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-secondary/30 shadow-card bg-secondary/5">
            <CardContent className="p-4">
              <Users className="h-5 w-5 text-secondary mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">Direct Referrals</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">2x2 max</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <DollarSign className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-300 shadow-card bg-emerald-50/30 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <Wallet className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">₦{availableBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Reserved for withdrawals: ₦{withdrawalReserved.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <UserPlus className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{directEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Direct Bonuses</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <Layers className="h-5 w-5 text-blue-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{matrixEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Matrix Earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Escrow notice */}
        {escrowTotal > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-foreground">
                <strong>₦{escrowTotal.toLocaleString()}</strong> held in escrow ({escrow.length} item{escrow.length !== 1 ? "s" : ""}). Activate your subscription within 30 days to unlock these earnings.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bi-weekly notice */}
        {lastWithdrawal && daysUntilNext > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-foreground">
                Last withdrawal {daysSince} day{daysSince !== 1 ? "s" : ""} ago. Next bi-weekly window opens in <strong>{daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Per-level breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-blue-600" /> Earnings by Generation (15 Levels)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {levelBreakdown.map(l => (
                <div
                  key={l.level}
                  className={`rounded-lg border p-3 text-center ${l.amount > 0 ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-border bg-muted/20"}`}
                >
                  <p className="text-[10px] text-muted-foreground">L{l.level}</p>
                  <p className={`font-display font-bold text-sm ${l.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    ₦{l.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{l.count} item{l.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Tree */}
        {profile?.id && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-secondary" /> Your 2x2 Referral Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReferralTree rootProfileId={profile.id} />
            </CardContent>
          </Card>
        )}

        {/* Direct referrals list */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Your Direct Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No referrals yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Joined</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 text-foreground font-medium">{r.full_name || "—"}</td>
                        <td className="py-2 px-3"><Badge variant="outline" className="capitalize text-xs">{r.profile_type}</Badge></td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-3">
                          {r.kyc_verified ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-emerald-600" /> Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No withdrawal requests yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Amount</th>
                      <th className="text-left py-2 px-3 font-medium">Bank</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-border/50">
                        <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-3 font-bold text-foreground">₦{(w.amount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-muted-foreground">{w.bank_name} · {w.account_number}</td>
                        <td className="py-2 px-3">
                          <Badge className={`text-xs ${wdStatusColors[w.status] || ""}`}>{w.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-secondary" /> Recent Earnings Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : earnings.filter(e => e.amount > 0).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p>No earnings yet. Share your referral link to start earning!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Type</th>
                      <th className="text-left py-2 px-3 font-medium">Level</th>
                      <th className="text-left py-2 px-3 font-medium">Description</th>
                      <th className="text-right py-2 px-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.filter(e => e.amount > 0).map((e) => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3 text-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3">
                          <Badge className={`text-xs ${typeColors[e.type] || "bg-muted text-muted-foreground"}`}>
                            {typeLabels[e.type] || e.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">{e.level ? `L${e.level}` : "—"}</td>
                        <td className="py-3 px-3 text-muted-foreground">{e.description || "—"}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">₦{(e.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WithdrawDialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={availableBalance}
        onSuccess={loadData}
      />
    </AuthenticatedLayout>
  );
};

export default Earnings;
