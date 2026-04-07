import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Home, Building, Copy, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Earnings = () => {
  const { user, profile } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    loadData();
  }, [user?.id, profile?.id]);

  const loadData = async () => {
    setLoading(true);
    const [earningsRes, referralsRes] = await Promise.all([
      (supabase as any).from("earnings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      (supabase as any).from("profiles").select("id").eq("referred_by", profile!.id),
    ]);
    setEarnings(earningsRes.data || []);
    setReferralCount(referralsRes.data?.length || 0);
    setLoading(false);
  };

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const rentRewards = earnings.filter(e => e.type === "rent_reward").reduce((s, e) => s + (e.amount || 0), 0);
  const saleRewards = earnings.filter(e => e.type === "sale_reward").reduce((s, e) => s + (e.amount || 0), 0);

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

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Earnings & Referrals 💰</h1>
          <p className="mt-1 text-muted-foreground">Track your income and grow your network</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <DollarSign className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">₦{totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-card">
            <CardContent className="p-4">
              <Users className="h-5 w-5 text-blue-600 mb-1" />
              <p className="font-display text-2xl font-bold text-foreground">{referralCount}</p>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
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
    </AuthenticatedLayout>
  );
};

export default Earnings;
