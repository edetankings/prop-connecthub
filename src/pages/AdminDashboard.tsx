import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Building, ShieldCheck, AlertTriangle, TrendingUp,
  CheckCircle, XCircle, FileText, LayoutDashboard, Gavel, ScrollText,
  DollarSign, Wallet, PieChart, Activity, ArrowUpRight, Eye, ExternalLink,
  CalendarCheck, Trash2, MessageSquare, Mail, MailOpen
} from "lucide-react";
import { toast } from "sonner";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Tab = "dashboard" | "users" | "moderation" | "disputes" | "audit" | "verification" | "reservations" | "support";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kycSteps, setKycSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, pr, v, d, a, t, ks] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("verification_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("verification_steps").select("*").order("created_at", { ascending: true }),
    ]);
    setProfiles(p.data || []);
    setProperties(pr.data || []);
    setVerifications(v.data || []);
    setDisputes(d.data || []);
    setAuditLogs(a.data || []);
    setTransactions(t.data || []);
    setKycSteps(ks.data || []);

    // Fetch all reservations for admin
    const { data: resData } = await (supabase as any)
      .from("reservations")
      .select("*, properties(title, city, state)")
      .order("created_at", { ascending: false });
    setAllReservations(resData || []);

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

  const handleApproveProperty = async (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    const { error } = await supabase.from("properties").update({ status: "available", is_verified: true } as any).eq("id", propertyId);
    if (error) { toast.error(error.message); return; }
    // Notify agent
    if (prop) {
      const agentProfile = profiles.find((p: any) => p.id === prop.agent_id);
      if (agentProfile) {
        await (supabase as any).from("notifications").insert({
          user_id: agentProfile.user_id,
          title: "Property Approved ✅",
          message: `Your property "${prop.title}" has been approved and is now live.`,
          type: "success",
          link: `/property/${propertyId}`,
        });
      }
    }
    toast.success("Property approved!");
    loadData();
  };

  const handleRejectProperty = async (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    const reason = prompt("Enter decline reason (optional):");
    const { error } = await supabase.from("properties").update({ status: "draft" } as any).eq("id", propertyId);
    if (error) { toast.error(error.message); return; }
    // Notify agent
    if (prop) {
      const agentProfile = profiles.find((p: any) => p.id === prop.agent_id);
      if (agentProfile) {
        await (supabase as any).from("notifications").insert({
          user_id: agentProfile.user_id,
          title: "Property Declined",
          message: `Your property "${prop.title}" was declined. ${reason ? `Reason: ${reason}. ` : ""}Please review and re-upload.`,
          type: "error",
          link: "/add-property",
        });
      }
    }
    toast.success("Property rejected");
    loadData();
  };

  const handleDisputeStatus = async (disputeId: string, status: string) => {
    const { error } = await supabase.from("disputes").update({ status }).eq("id", disputeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Dispute updated");
    loadData();
  };

  const handleKycStepReview = async (stepId: string, stepUserId: string, stepName: string, status: "approved" | "rejected", reason?: string) => {
    const updateData: any = { status };
    if (reason) updateData.rejection_reason = reason;
    const { error } = await (supabase as any).from("verification_steps").update(updateData).eq("id", stepId);
    if (error) { toast.error(error.message); return; }

    // Send notification to user
    const notifTitle = status === "approved" ? "Verification Step Approved" : "Verification Step Declined";
    const notifMessage = status === "approved"
      ? `Your ${stepName.replace(/_/g, " ")} verification has been approved.`
      : `Your ${stepName.replace(/_/g, " ")} verification was declined. ${reason ? `Reason: ${reason}. ` : ""}Please submit correct documents and try again.`;
    const notifType = status === "approved" ? "success" : "error";

    await (supabase as any).from("notifications").insert({
      user_id: stepUserId,
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      link: "/verification",
    });

    // Check if all steps are now approved for this user
    if (status === "approved") {
      const { data: allSteps } = await (supabase as any)
        .from("verification_steps")
        .select("*")
        .eq("user_id", stepUserId);
      
      if (allSteps && allSteps.every((s: any) => s.status === "approved")) {
        // Mark profile as fully verified
        const userProfile = profiles.find((p: any) => p.user_id === stepUserId);
        if (userProfile) {
          await supabase.from("profiles").update({ kyc_verified: true, trust_score: 85 }).eq("id", userProfile.id);
        }
        await (supabase as any).from("notifications").insert({
          user_id: stepUserId,
          title: "Account Fully Verified! ✅",
          message: "Congratulations! Your account verification has been approved. You now have full access to all platform features.",
          type: "success",
          link: "/verification",
        });
      }
    }

    toast.success(`Step ${status}`);
    loadData();
  };

  const handleToggleVisibility = async (profileId: string, currentlyVisible: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_visible: !currentlyVisible }).eq("id", profileId);
    if (error) { toast.error(error.message); return; }
    toast.success(currentlyVisible ? "Agent hidden" : "Agent visible");
    loadData();
  };

  const handleDeleteUser = async (profileUserId: string, profileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the account for "${profileName}"? This action cannot be undone.`);
    if (!confirmed) return;
    const doubleConfirm = window.confirm(`FINAL WARNING: All data for "${profileName}" will be permanently deleted. Continue?`);
    if (!doubleConfirm) return;

    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: profileUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Account for "${profileName}" has been deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    }
  };

  // Stats
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
  const pendingProperties = properties.filter((p) => p.status === "under_verification").length;
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const pendingKycSteps = kycSteps.filter((s: any) => s.status === "pending");

  // Get unique users with pending verification steps
  const pendingVerificationUsers = Array.from(new Set(pendingKycSteps.map((s: any) => s.user_id)));

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "verification" as Tab, label: "Verification Requests", icon: ShieldCheck, count: pendingKycSteps.length },
    { id: "users" as Tab, label: "Users", icon: Users },
    { id: "moderation" as Tab, label: "Properties", icon: FileText, count: pendingProperties },
    { id: "disputes" as Tab, label: "Disputes", icon: Gavel, count: openDisputes },
    { id: "audit" as Tab, label: "Audit Logs", icon: ScrollText },
    { id: "reservations" as Tab, label: "Reservations", icon: CalendarCheck, count: allReservations.filter((r: any) => r.status === "pending").length },
  ];

  // Selected user details for verification review
  const selectedUserProfile = selectedUserId ? profiles.find((p: any) => p.user_id === selectedUserId) : null;
  const selectedUserSteps = selectedUserId ? kycSteps.filter((s: any) => s.user_id === selectedUserId) : [];

  return (
    <AuthenticatedLayout>
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
              onClick={() => { setTab(t.id); setSelectedUserId(null); }}
              className={`gap-2 shrink-0 ${tab === t.id ? "" : "text-muted-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count && t.count > 0 ? (
                <span className="h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {t.count}
                </span>
              ) : null}
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
                <div className="grid gap-4 md:grid-cols-4">
                  <GlassCard icon={Users} label="Total Users" value={profiles.length} />
                  <GlassCard icon={ShieldCheck} label="Verified Agents" value={verifiedAgents} />
                  <GlassCard icon={CheckCircle} label="Completed Transactions" value={completedTx} />
                  <GlassCard icon={TrendingUp} label="Escrow Success Rate" value={completedTx > 0 ? `${Math.round((completedTx / Math.max(transactions.length, 1)) * 100)}%` : "—"} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                    {pendingKycSteps.length > 0 && (
                      <button onClick={() => setTab("verification")} className="w-full flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--warning))]/5 hover:bg-[hsl(var(--warning))]/10 transition-colors text-left">
                        <span className="flex items-center gap-2 text-sm">
                          <ShieldCheck className="h-4 w-4 text-[hsl(var(--warning))]" />
                          <span className="text-foreground">{pendingKycSteps.length} Pending Verification Step{pendingKycSteps.length > 1 ? "s" : ""}</span>
                        </span>
                        <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0 text-xs">Review</Badge>
                      </button>
                    )}
                    {openDisputes > 0 && (
                      <button onClick={() => setTab("disputes")} className="w-full flex items-center justify-between p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors text-left">
                        <span className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-foreground">{openDisputes} Open Dispute{openDisputes > 1 ? "s" : ""}</span>
                        </span>
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      </button>
                    )}
                    {pendingKycSteps.length === 0 && openDisputes === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">No priority items</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VERIFICATION REQUESTS TAB */}
            {tab === "verification" && !selectedUserId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-foreground">Verification Requests</h2>
                  <Badge variant="outline">{pendingVerificationUsers.length} user{pendingVerificationUsers.length !== 1 ? "s" : ""} pending</Badge>
                </div>

                {pendingVerificationUsers.length === 0 && kycSteps.length === 0 && (
                  <p className="p-8 text-center text-muted-foreground">No verification requests yet</p>
                )}

                {/* Table of all users with verification steps */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">User Name</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progress</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pending</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(kycSteps.map((s: any) => s.user_id))).map((userId: any) => {
                          const userProfile = profiles.find((p: any) => p.user_id === userId);
                          const userSteps = kycSteps.filter((s: any) => s.user_id === userId);
                          const approved = userSteps.filter((s: any) => s.status === "approved").length;
                          const pending = userSteps.filter((s: any) => s.status === "pending").length;
                          const latestStep = userSteps[userSteps.length - 1];

                          return (
                            <tr key={userId} className="border-t border-border hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{userProfile?.full_name || "Unknown"}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">{userProfile?.profile_type || "—"}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-foreground font-medium">{approved}/{userSteps.length}</span>
                                <span className="text-muted-foreground ml-1">steps</span>
                              </td>
                              <td className="px-4 py-3">
                                {pending > 0 ? (
                                  <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0">{pending} pending</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {approved === userSteps.length ? (
                                  <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0">Verified</Badge>
                                ) : pending > 0 ? (
                                  <Badge className="bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-0">Pending Review</Badge>
                                ) : (
                                  <Badge variant="outline">In Progress</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {latestStep ? new Date(latestStep.updated_at).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedUserId(userId)}>
                                  <Eye className="h-3.5 w-3.5" /> Review
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {kycSteps.length === 0 && <p className="p-8 text-center text-muted-foreground">No verification data</p>}
                </div>
              </div>
            )}

            {/* VERIFICATION DETAIL VIEW */}
            {tab === "verification" && selectedUserId && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}>← Back</Button>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Review: {selectedUserProfile?.full_name || "User"}
                  </h2>
                  <Badge variant="outline" className="capitalize">{selectedUserProfile?.profile_type}</Badge>
                </div>

                {/* User Info Card */}
                <Card className="border-border/50 shadow-card">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {selectedUserProfile?.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{selectedUserProfile?.full_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{selectedUserProfile?.profile_type} · Trust: {selectedUserProfile?.trust_score}/100</p>
                        <p className="text-xs text-muted-foreground">{selectedUserProfile?.phone || "No phone"} · {selectedUserProfile?.location || "No location"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Steps Review */}
                <div className="space-y-3">
                  {selectedUserSteps.map((step: any) => (
                    <Card key={step.id} className={`border-border/50 shadow-card ${
                      step.status === "approved" ? "border-l-4 border-l-[hsl(var(--success))]" :
                      step.status === "pending" ? "border-l-4 border-l-[hsl(var(--info))]" :
                      step.status === "rejected" ? "border-l-4 border-l-destructive" : ""
                    }`}>
                      <CardContent className="pt-5">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-foreground capitalize">{step.step_name?.replace(/_/g, " ")}</p>
                              <Badge variant="outline" className={`text-xs ${
                                step.status === "approved" ? "text-[hsl(var(--success))]" :
                                step.status === "pending" ? "text-[hsl(var(--info))]" :
                                step.status === "rejected" ? "text-destructive" : ""
                              }`}>{step.status}</Badge>
                            </div>

                            {/* Document preview */}
                            {step.document_url && (
                              <div className="mb-2">
                                {step.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <div className="space-y-2">
                                    <img src={step.document_url} alt="Document" className="max-w-[300px] rounded-lg border border-border" />
                                    <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                                      <ExternalLink className="h-3 w-3" /> Open full size
                                    </a>
                                  </div>
                                ) : (
                                  <a href={step.document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline flex items-center gap-1">
                                    <FileText className="h-4 w-4" /> View uploaded document
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Metadata */}
                            {step.metadata && (
                              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                                {Object.entries(step.metadata).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                                    <span className="text-foreground font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {step.rejection_reason && (
                              <p className="text-xs text-destructive mt-2">Rejected: {step.rejection_reason}</p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Last updated: {new Date(step.updated_at).toLocaleString()}
                            </p>
                          </div>

                          {/* Action buttons */}
                          {step.status === "pending" && (
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleKycStepReview(step.id, step.user_id, step.step_name, "approved")}
                                className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1"
                              >
                                <CheckCircle className="h-4 w-4" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => {
                                  const reason = prompt("Enter decline reason:");
                                  if (reason) handleKycStepReview(step.id, step.user_id, step.step_name, "rejected", reason);
                                }}
                              >
                                <XCircle className="h-4 w-4" /> Decline
                              </Button>
                            </div>
                          )}

                          {step.status === "approved" && (
                            <CheckCircle className="h-6 w-6 text-[hsl(var(--success))] shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {tab === "users" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trust</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">KYC</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visible</th>
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
                              <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[hsl(var(--warning))]">Pending</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {p.profile_type === "agent" ? (
                              <Badge className={p.is_visible ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0" : "bg-muted text-muted-foreground"}>
                                {p.is_visible ? "Yes" : "No"}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setTab("verification"); setSelectedUserId(p.user_id); }}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                              {!p.kyc_verified && p.profile_type === "agent" && (
                                <Button size="sm" variant="outline" onClick={() => handleVerifyKyc(p.id)}>Verify</Button>
                              )}
                              {p.profile_type === "agent" && (
                                <Button size="sm" variant="outline" onClick={() => handleToggleVisibility(p.id, p.is_visible)}>
                                  {p.is_visible ? "Hide" : "Show"}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => handleDeleteUser(p.user_id, p.full_name || "Unknown")}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {profiles.length === 0 && <p className="p-8 text-center text-muted-foreground">No users yet</p>}
              </div>
            )}

            {/* MODERATION TAB */}
            {tab === "moderation" && (
              <div className="space-y-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Properties Pending Approval</h2>
                {properties.filter((p) => p.status === "under_verification").length === 0 && <p className="text-muted-foreground text-sm">No pending properties</p>}
                {properties.filter((p) => p.status === "under_verification").map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                    <div className="flex flex-col md:flex-row">
                      {p.image_url && (
                        <div className="w-full md:w-48 h-36 bg-muted shrink-0">
                          <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-4 flex-1">
                        <p className="font-semibold text-foreground text-lg">{p.title}</p>
                        <p className="text-sm text-secondary font-bold mt-1">₦{(p.price || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{p.city}, {p.state} · Agent: {p.profiles?.full_name || "—"}</p>
                        <Badge variant="outline" className="mt-2 text-[hsl(var(--warning))]">Pending Approval</Badge>
                      </div>
                      <div className="flex md:flex-col gap-2 p-4 items-center justify-end">
                        <Button size="sm" onClick={() => handleApproveProperty(p.id)} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRejectProperty(p.id)} className="gap-1">
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <h2 className="font-display text-lg font-semibold text-foreground mt-8">Verification Documents</h2>
                {verifications.length === 0 && <p className="p-8 text-center text-muted-foreground">No documents</p>}
                {verifications.map((v) => {
                  const docProfile = profiles.find((p: any) => p.user_id === v.user_id);
                  return (
                    <div key={v.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between shadow-card">
                      <div>
                        <p className="font-medium text-foreground capitalize">{v.document_type?.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">User: {docProfile?.full_name || v.user_id?.slice(0, 8)}</p>
                        {v.file_url && v.file_url !== "metadata-only" && (
                          <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View document</a>
                        )}
                        <Badge variant="outline" className="mt-1 ml-2">{v.status}</Badge>
                      </div>
                      {v.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleDocumentReview(v.id, "approved")} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90">Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDocumentReview(v.id, "rejected")}>Reject</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <div className="overflow-x-auto">
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
                </div>
                {auditLogs.length === 0 && <p className="p-8 text-center text-muted-foreground">No audit logs</p>}
              </div>
            )}

            {/* RESERVATIONS TAB */}
            {tab === "reservations" && (
              <div className="space-y-4">
                <h2 className="font-display text-lg font-semibold text-foreground">Reservation Management</h2>
                {allReservations.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground">No reservations</p>
                ) : (
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Buyer</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Viewing Date</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allReservations.map((r: any) => {
                            const buyerProfile = profiles.find((p: any) => p.id === r.buyer_id);
                            const agentProfile = profiles.find((p: any) => p.id === r.agent_id);
                            const resColors: Record<string, string> = {
                              pending: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
                              confirmed: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
                              rejected: "bg-destructive/10 text-destructive",
                              cancelled: "bg-muted text-muted-foreground",
                            };
                            return (
                              <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{r.properties?.title || "—"}</td>
                                <td className="px-4 py-3 text-foreground">{r.buyer_name || buyerProfile?.full_name || "—"}</td>
                                <td className="px-4 py-3 text-foreground">{agentProfile?.full_name || "—"}</td>
                                <td className="px-4 py-3 text-muted-foreground">{r.viewing_date ? new Date(r.viewing_date).toLocaleDateString() : "—"}</td>
                                <td className="px-4 py-3">
                                  <Badge className={`text-xs ${resColors[r.status] || "bg-muted text-muted-foreground"}`}>
                                    {r.status?.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    {r.status === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1 text-xs"
                                          onClick={async () => {
                                            await (supabase as any).from("reservations").update({ status: "confirmed" }).eq("id", r.id);
                                            const bp = profiles.find((p: any) => p.id === r.buyer_id);
                                            if (bp) {
                                              await (supabase as any).from("notifications").insert({
                                                user_id: bp.user_id,
                                                title: "Reservation Approved ✅",
                                                message: `Your reservation for "${r.properties?.title}" has been approved.`,
                                                type: "success",
                                                link: "/buyer-dashboard",
                                              });
                                            }
                                            toast.success("Reservation approved");
                                            loadData();
                                          }}
                                        >
                                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="gap-1 text-xs"
                                          onClick={async () => {
                                            await (supabase as any).from("reservations").update({ status: "rejected" }).eq("id", r.id);
                                            const bp = profiles.find((p: any) => p.id === r.buyer_id);
                                            if (bp) {
                                              await (supabase as any).from("notifications").insert({
                                                user_id: bp.user_id,
                                                title: "Reservation Rejected",
                                                message: `Your reservation for "${r.properties?.title}" was rejected.`,
                                                type: "error",
                                                link: "/buyer-dashboard",
                                              });
                                            }
                                            toast.success("Reservation rejected");
                                            loadData();
                                          }}
                                        >
                                          <XCircle className="h-3.5 w-3.5" /> Reject
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                                      onClick={async () => {
                                        if (!confirm("Delete this reservation?")) return;
                                        await (supabase as any).from("reservations").delete().eq("id", r.id);
                                        toast.success("Reservation deleted");
                                        loadData();
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
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
