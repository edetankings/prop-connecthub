import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Building, ShieldCheck, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, FileText, LayoutDashboard, Gavel, ScrollText,
  DollarSign, Wallet, PieChart, Activity, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Tab = "dashboard" | "users" | "moderation" | "disputes" | "audit";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, pr, v, d, a, t] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("verification_documents").select("*, profiles!verification_documents_user_id_fkey(full_name)").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles(p.data || []);
    setProperties(pr.data || []);
    setVerifications(v.data || []);
    setDisputes(d.data || []);
    setAuditLogs(a.data || []);
    setTransactions(t.data || []);
    setLoading(false);
  };

  const handleVerifyKyc = async (profileId: string) => {
    const { error } = await supabase.from("profiles").update({ kyc_verified: true, trust_score: 80 }).eq("id", profileId);
    if (error) { toast.error(error.message); return; }
    toast.success("Agent verified!");
    loadData();
  };

  const handleDocumentReview = async (docId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("verification_documents").update({ status }).eq("id", docId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Document ${status}`);
    loadData();
  };

  const handleDisputeStatus = async (disputeId: string, status: string) => {
    const { error } = await supabase.from("disputes").update({ status }).eq("id", disputeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Dispute updated");
    loadData();
  };

  const verifiedAgents = profiles.filter((p) => p.kyc_verified).length;
  const completedTx = transactions.filter((t) => t.status === "completed").length;
  const totalRevenue = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  const totalCommission = transactions.reduce((s, t) => s + (t.commission || 0), 0);

  const trustHigh = profiles.filter((p) => p.trust_score >= 70).length;
  const trustMedium = profiles.filter((p) => p.trust_score >= 40 && p.trust_score < 70).length;
  const trustLow = profiles.filter((p) => p.trust_score < 40).length;
  const avgTrust = profiles.length ? Math.round(profiles.reduce((s, p) => s + p.trust_score, 0) / profiles.length) : 0;

  const trustData = [
    { name: "High", value: trustHigh, color: "hsl(var(--success))" },
    { name: "Medium", value: trustMedium, color: "hsl(var(--warning))" },
    { name: "Low", value: trustLow, color: "hsl(var(--destructive))" },
  ];

  const pendingKyc = verifications.filter((v) => v.status === "pending").length;
  const openDisputes = disputes.filter((d) => d.status === "open").length;

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "users" as Tab, label: "Users", icon: Users },
    { id: "moderation" as Tab, label: "Moderation", icon: ShieldCheck },
    { id: "disputes" as Tab, label: "Disputes", icon: Gavel },
    { id: "audit" as Tab, label: "Audit Logs", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Command Center</h1>
            <p className="text-sm text-muted-foreground">Platform overview & management</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(t.id)}
              className={`gap-2 shrink-0 ${tab === t.id ? "" : "text-muted-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {tab === "dashboard" && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <GlassCard icon={Users} label="Total Users" value={profiles.length} />
                  <GlassCard icon={ShieldCheck} label="Verified Agents" value={verifiedAgents} />
                  <GlassCard icon={CheckCircle} label="Completed Transactions" value={completedTx} />
                  <GlassCard icon={TrendingUp} label="Escrow Success Rate" value={completedTx > 0 ? `${Math.round((completedTx / Math.max(transactions.length, 1)) * 100)}%` : "—"} />
                </div>

                {/* Revenue & Trust */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Revenue */}
                  <Card className="border-border/50 shadow-card bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-secondary" /> Revenue Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <span className="font-display font-bold text-foreground">₦{totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground">Commission Earned</span>
                        <span className="font-display font-bold text-secondary">₦{totalCommission.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trust Distribution */}
                  <Card className="border-border/50 shadow-card bg-card/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-secondary" /> Trust Score Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie data={trustData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                                {trustData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 flex-1">
                          {trustData.map((d) => (
                            <div key={d.name} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                                {d.name}
                              </span>
                              <span className="font-medium text-foreground">{d.value}</span>
                            </div>
                          ))}
                          <div className="pt-1 border-t border-border text-sm flex justify-between">
                            <span className="text-muted-foreground">Avg Score</span>
                            <span className="font-bold text-foreground">{avgTrust}/100</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Priority Activity */}
                <Card className="border-border/50 shadow-card bg-card/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-secondary" /> Priority Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {openDisputes > 0 && (
                      <button onClick={() => setTab("disputes")} className="w-full flex items-center justify-between p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors text-left">
                        <span className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-foreground">{openDisputes} Open Dispute{openDisputes > 1 ? "s" : ""}</span>
                        </span>
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      </button>
                    )}
                    {pendingKyc > 0 && (
                      <button onClick={() => setTab("moderation")} className="w-full flex items-center justify-between p-3 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors text-left">
                        <span className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-warning" />
                          <span className="text-foreground">{pendingKyc} Pending KYC Review{pendingKyc > 1 ? "s" : ""}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    {transactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <span className="text-foreground">Transaction: ₦{(t.amount || 0).toLocaleString()}</span>
                        <Badge variant="outline">{t.status}</Badge>
                      </div>
                    ))}
                    {openDisputes === 0 && pendingKyc === 0 && transactions.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">No priority items</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* USERS TAB */}
            {tab === "users" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trust</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">KYC</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{p.profile_type}</Badge></td>
                        <td className="px-4 py-3 text-foreground">{p.trust_score}/100</td>
                        <td className="px-4 py-3">
                          {p.kyc_verified ? (
                            <Badge className="bg-success/10 text-success border-0">Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!p.kyc_verified && p.profile_type === "agent" && (
                            <Button size="sm" variant="outline" onClick={() => handleVerifyKyc(p.id)}>Verify</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profiles.length === 0 && <p className="p-8 text-center text-muted-foreground">No users yet</p>}
              </div>
            )}

            {/* MODERATION TAB */}
            {tab === "moderation" && (
              <div className="space-y-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Verification Documents</h2>
                {verifications.length === 0 && <p className="p-8 text-center text-muted-foreground">No documents</p>}
                {verifications.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-card">
                    <div>
                      <p className="font-medium text-foreground">{v.document_type}</p>
                      <p className="text-sm text-muted-foreground">User: {v.profiles?.full_name || v.user_id}</p>
                      <Badge variant="outline" className="mt-1">{v.status}</Badge>
                    </div>
                    {v.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDocumentReview(v.id, "approved")} className="bg-success text-success-foreground hover:bg-success/90">Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDocumentReview(v.id, "rejected")}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}

                <h2 className="font-display text-lg font-semibold text-foreground mt-8">Properties Pending Review</h2>
                {properties.filter((p) => p.status === "under_verification").length === 0 && <p className="text-muted-foreground text-sm">None pending</p>}
                {properties.filter((p) => p.status === "under_verification").map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-card">
                    <div>
                      <p className="font-medium text-foreground">{p.title}</p>
                      <p className="text-sm text-muted-foreground">₦{(p.price || 0).toLocaleString()} · {p.profiles?.full_name}</p>
                    </div>
                    <Badge variant="outline">Under Verification</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* DISPUTES TAB */}
            {tab === "disputes" && (
              <div className="space-y-4">
                {disputes.length === 0 && <p className="p-8 text-center text-muted-foreground">No disputes</p>}
                {disputes.map((d) => (
                  <div key={d.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{d.reason}</p>
                        <Badge variant="outline" className="mt-1">{d.status}</Badge>
                      </div>
                      {d.status === "open" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleDisputeStatus(d.id, "resolved")}>Resolve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDisputeStatus(d.id, "dismissed")}>Dismiss</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AUDIT LOGS TAB */}
            {tab === "audit" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{log.user_id?.slice(0, 8) || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{JSON.stringify(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && <p className="p-8 text-center text-muted-foreground">No audit logs</p>}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

const GlassCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <Card className="border-border/50 shadow-card bg-card/80 backdrop-blur-sm">
    <CardContent className="pt-5 pb-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
