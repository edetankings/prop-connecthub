import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Home, Building, Copy, TrendingUp, Wallet, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import WithdrawDialog from "@/components/WithdrawDialog";
import ReferralTree from "@/components/ReferralTree";

const Earnings = () => {
  const { user, profile } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [downlineCount, setDownlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    loadData();
  }, [user?.id, profile?.id]);

  const loadData = async () => {
    setLoading(true);
    const [earningsRes, refsRes, wdRes] = await Promise.all([
      (supabase as any).from("earnings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      (supabase as any).from("profiles").select("id, full_name, profile_type, kyc_verified, created_at, referral_level").eq("referred_by", profile!.id).order("created_at", { ascending: false }),
      (supabase as any).from("withdrawals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setEarnings(earningsRes.data || []);
    setReferrals(refsRes.data || []);
    setWithdrawals(wdRes.data || []);

    // Compute total downline (L1+L2+L3) count
    const l1Ids = (refsRes.data || []).filter((r: any) => r.referral_level === 1).map((r: any) => r.id);
    let total = (refsRes.data || []).length;
    if (l1Ids.length) {
      const { data: l2 } = await (supabase as any).from("profiles").select("id").in("referred_by", l1Ids).eq("referral_level", 1);
      const l2Ids = (l2 || []).map((r: any) => r.id);
      total += (l2 || []).length;
      if (l2Ids.length) {
        const { data: l3 } = await (supabase as any).from("profiles").select("id").in("referred_by", l2Ids).eq("referral_level", 1);
        total += (l3 || []).length;
      }
    }
    setDownlineCount(total);
    setLoading(false);
  };

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const totalApprovedWithdrawals = withdrawals
    .filter((w) => w.status === "approved" || w.status === "pending")
    .reduce((s, w) => s + (w.amount || 0), 0);
  const availableBalance = Math.max(0, totalEarnings - totalApprovedWithdrawals);

  const rentRewards = earnings.filter(e => e.type === "rent_reward").reduce((s, e) => s + (e.amount || 0), 0);
  const saleRewards = earnings.filter(e => e.type === "sale_reward").reduce((s, e) => s + (e.amount || 0), 0);

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

  const typeColors: Record<string, string> = {
    rent_reward: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    sale_reward: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    referral: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  const typeLabels: Record<string, string> = {
    rent_reward: "Rent Reward",
    sale_reward: "Sale Reward",
    referral: "Referral Bonus",
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
            <h1 className="font-display text-3xl font-bold text-foreground">Earnings & Referrals 💰</h1>
            <p className="mt-1 text-muted-foreground">Track your income and grow your 3x3 network</p>
          </div>
          <Button onClick={() => setWithdrawOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Wallet className="h-4 w-4" /> Withdraw
          </Button>
        </div>

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
              <p className="font-display text-2xl font-bold text-foreground">{downlineCount}</p>
              <p className="text-xs text-muted-foreground">People Referred</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{referrals.length} direct</p>
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
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <Home className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{rentRewards.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Rent Rewards</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <Building className="h-5 w-5 text-amber-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{saleRewards.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Sale Rewards</p>
            </CardContent>
          </Card>
        </div>

        {/* Bi-weekly notice */}
        {lastWithdrawal && daysUntilNext > 0 && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-foreground">
                Your last withdrawal was {daysSince} day{daysSince !== 1 ? "s" : ""} ago. Next bi-weekly window opens in <strong>{daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Referral Tree */}
        {profile?.id && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-secondary" /> Your 3x3 Referral Matrix
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
              <Users className="h-4 w-4 text-primary" /> Your Referred Users
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
              <TrendingUp className="h-4 w-4 text-secondary" /> Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : earnings.length === 0 ? (
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
                      <th className="text-left py-2 px-3 font-medium">Description</th>
                      <th className="text-right py-2 px-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((e) => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3 text-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3">
                          <Badge className={`text-xs ${typeColors[e.type] || "bg-muted text-muted-foreground"}`}>
                            {typeLabels[e.type] || e.type}
                          </Badge>
                        </td>
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
