import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  CalendarCheck, Trash2, MessageSquare, Mail, MailOpen, Megaphone, Edit3, Plus, CreditCard, Network
} from "lucide-react";
import { MessageCircle } from "lucide-react";
import ReferralTree from "@/components/ReferralTree";
import logo from "@/assets/logo.jpg";
import { toast } from "sonner";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Tab = "dashboard" | "matrix" | "users" | "moderation" | "disputes" | "audit" | "verification" | "reservations" | "support" | "announcements" | "earnings" | "subscriptions" | "active-deals" | "withdrawals" | "referrals";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
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
  const [dbAnnouncements, setDbAnnouncements] = useState<any[]>([]);
  const [annForm, setAnnForm] = useState({ title: "", content: "", type: "update" });
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [allEarnings, setAllEarnings] = useState<any[]>([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [subRequests, setSubRequests] = useState<any[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
  const [activeDealThreads, setActiveDealThreads] = useState<any[]>([]);
  const [selectedDealMessages, setSelectedDealMessages] = useState<any[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [selectedReferralUserId, setSelectedReferralUserId] = useState<string | null>(null);
  const [companyWallet, setCompanyWallet] = useState<{ balance: number; total_earned: number } | null>(null);
  const [escrowHolds, setEscrowHolds] = useState<any[]>([]);
  const [propertyDocs, setPropertyDocs] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAdminProfileId(data?.id ?? null));
  }, [user?.id]);

  const handleAdminChat = async (targetProfileId: string) => {
    if (!adminProfileId) {
      toast.error("Admin profile not loaded yet");
      return;
    }
    if (targetProfileId === adminProfileId) {
      toast.info("Cannot chat with yourself");
      return;
    }
    // Try find existing thread either direction
    const { data: existing } = await supabase
      .from("chat_threads")
      .select("id")
      .or(
        `and(buyer_id.eq.${adminProfileId},agent_id.eq.${targetProfileId}),and(buyer_id.eq.${targetProfileId},agent_id.eq.${adminProfileId})`
      )
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("chat_threads")
      .insert({ buyer_id: adminProfileId, agent_id: targetProfileId, status: "open" } as any)
      .select("id")
      .maybeSingle();

    if (error || !created) {
      toast.error(error?.message || "Failed to start chat");
      return;
    }
    navigate(`/chat/${created.id}`);
  };

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

    const { data: ticketsData } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setSupportTickets(ticketsData || []);

    const { data: annData } = await (supabase as any)
      .from("announcements")
      .select("*, profiles!announcements_author_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setDbAnnouncements(annData || []);

    const { data: earningsData } = await (supabase as any)
      .from("earnings")
      .select("*")
      .order("created_at", { ascending: false });
    setAllEarnings(earningsData || []);

    const { data: docsData } = await (supabase as any)
      .from("property_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    setPropertyDocs(docsData || []);

    const { data: subReqData } = await (supabase as any)
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setSubRequests(subReqData || []);

    const { data: subsData } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false });
    setAllSubscriptions(subsData || []);

    // Active deal threads
    const { data: dealThreads } = await (supabase as any)
      .from("chat_threads")
      .select("*")
      .eq("status", "active")
      .order("last_message_at", { ascending: false });
    if (dealThreads) {
      const enriched = await Promise.all(
        dealThreads.map(async (t: any) => {
          const [buyerRes, agentRes, propRes, msgRes] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", t.buyer_id).maybeSingle(),
            supabase.from("profiles").select("full_name").eq("id", t.agent_id).maybeSingle(),
            t.property_id ? supabase.from("properties").select("title").eq("id", t.property_id).maybeSingle() : { data: null },
            supabase.from("messages").select("*", { count: "exact", head: true }).eq("thread_id", t.id),
          ]);
          return { ...t, buyer_name: buyerRes.data?.full_name || "Unknown", agent_name: agentRes.data?.full_name || "Unknown", property_title: propRes.data?.title || "N/A", message_count: msgRes.count || 0 };
        })
      );
      setActiveDealThreads(enriched);
    }

    // Withdrawals
    const { data: wdData } = await (supabase as any)
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });
    setWithdrawals(wdData || []);

    // KYC submissions (full documents)
    const { data: kycData } = await (supabase as any)
      .from("kyc_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });
    setKycSubmissions(kycData || []);

    // Company wallet
    const { data: cwData } = await (supabase as any)
      .from("company_wallet")
      .select("balance, total_earned")
      .maybeSingle();
    setCompanyWallet(cwData || null);

    // Escrow holds
    const { data: escData } = await (supabase as any)
      .from("escrow_holds")
      .select("*")
      .order("created_at", { ascending: false });
    setEscrowHolds(escData || []);

    setLoading(false);
  };

  const handleVerifyKyc = async (profileId: string) => {
    // Update profile
    const { error } = await supabase.from("profiles").update({ kyc_verified: true, trust_score: 80 }).eq("id", profileId);
    if (error) { toast.error(error.message); return; }

    // Get user_id from profile
    const targetProfile = profiles.find((p: any) => p.id === profileId);
    if (targetProfile) {
      // Update kyc_verifications status to verified
      await (supabase as any).from("kyc_verifications").update({
        kyc_status: "verified",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("user_id", targetProfile.user_id);

      // Also approve all pending verification steps
      await (supabase as any).from("verification_steps").update({ status: "approved" })
        .eq("user_id", targetProfile.user_id)
        .neq("status", "approved");

      // Send notification
      await (supabase as any).from("notifications").insert({
        user_id: targetProfile.user_id,
        title: "Account Verified! ✅",
        message: "Congratulations! Your identity verification has been approved. You now have full access to all platform features.",
        type: "success",
        link: "/dashboard",
      });

      // Log audit
      await (supabase as any).from("audit_logs").insert({
        user_id: user?.id,
        action: "verify_agent",
        details: { profile_id: profileId, agent_name: targetProfile.full_name },
      });
    }

    toast.success("Agent verified successfully!");
    loadData();
  };

  const handleDocumentReview = async (docId: string, status: "approved" | "rejected") => {
    const { data: doc, error } = await supabase
      .from("verification_documents")
      .update({ status })
      .eq("id", docId)
      .select("*")
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (status === "approved" && doc?.user_id) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ kyc_verified: true, trust_score: 80 })
        .eq("user_id", doc.user_id);
      if (profErr) toast.error("Document approved, but failed to update KYC status");
    }

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
           await supabase.from("profiles").update({ kyc_verified: true, trust_score: 80 }).eq("id", userProfile.id);
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

    // If rejected, ensure profile is not marked as verified
    if (status === "rejected") {
      const userProfile = profiles.find((p: any) => p.user_id === stepUserId);
      if (userProfile && userProfile.kyc_verified) {
        await supabase.from("profiles").update({ kyc_verified: false }).eq("id", userProfile.id);
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
  const handleApproveSubscription = async (requestId: string, reqUserId: string) => {
    await (supabase as any).from("subscription_requests").update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const existing = allSubscriptions.find((s: any) => s.user_id === reqUserId);
    if (existing) {
      await (supabase as any).from("subscriptions").update({ status: "active", start_date: startDate.toISOString(), end_date: endDate.toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await (supabase as any).from("subscriptions").insert({ user_id: reqUserId, status: "active", start_date: startDate.toISOString(), end_date: endDate.toISOString() });
    }
    await (supabase as any).from("notifications").insert({
      user_id: reqUserId, title: "Subscription Activated ✅",
      message: "Your subscription has been approved. You now have full access to all agent features for 30 days.",
      type: "success", link: "/payments",
    });
    toast.success("Subscription approved!");
    loadData();
  };

  const handleRejectSubscription = async (requestId: string, reqUserId: string) => {
    const reason = prompt("Rejection reason (optional):");
    await (supabase as any).from("subscription_requests").update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
    await (supabase as any).from("notifications").insert({
      user_id: reqUserId, title: "Subscription Payment Rejected",
      message: `Your subscription payment was rejected. ${reason ? `Reason: ${reason}. ` : ""}Please try again.`,
      type: "error", link: "/payments",
    });
    toast.success("Subscription rejected");
    loadData();
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

  // Get unique users with pending verification steps OR pending kyc submissions
  const pendingVerificationUsers = Array.from(new Set([
    ...pendingKycSteps.map((s: any) => s.user_id),
    ...kycSubmissions.filter((k: any) => k.kyc_status === "pending").map((k: any) => k.user_id),
  ]));

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "matrix" as Tab, label: "Matrix Overview", icon: Network },
    { id: "verification" as Tab, label: "Verification Requests", icon: ShieldCheck, count: pendingKycSteps.length },
    { id: "users" as Tab, label: "Users", icon: Users },
    { id: "moderation" as Tab, label: "Properties", icon: FileText, count: pendingProperties },
    { id: "disputes" as Tab, label: "Disputes", icon: Gavel, count: openDisputes },
    { id: "audit" as Tab, label: "Audit Logs", icon: ScrollText },
    { id: "reservations" as Tab, label: "Reservations", icon: CalendarCheck, count: allReservations.filter((r: any) => r.status === "pending").length },
    { id: "support" as Tab, label: "Support Messages", icon: MessageSquare, count: supportTickets.filter((t: any) => t.status === "open").length },
    { id: "announcements" as Tab, label: "Announcements", icon: Megaphone, count: dbAnnouncements.length },
    { id: "earnings" as Tab, label: "Earnings", icon: DollarSign },
    { id: "subscriptions" as Tab, label: "Subscriptions", icon: CreditCard, count: subRequests.filter((r: any) => r.status === "pending").length },
    { id: "active-deals" as Tab, label: "Active Deals", icon: MessageCircle, count: activeDealThreads.length },
    { id: "withdrawals" as Tab, label: "Withdrawals", icon: Wallet, count: withdrawals.filter((w: any) => w.status === "pending").length },
    { id: "referrals" as Tab, label: "Referral Trees", icon: Network },
  ];

  // Selected user details for verification review
  const selectedUserProfile = selectedUserId ? profiles.find((p: any) => p.user_id === selectedUserId) : null;
  const selectedUserSteps = selectedUserId ? kycSteps.filter((s: any) => s.user_id === selectedUserId) : [];

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="PROP-connect" className="h-12 w-12 rounded-xl object-contain" />
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
                        {Array.from(new Set([...kycSteps.map((s: any) => s.user_id), ...kycSubmissions.map((k: any) => k.user_id)])).map((userId: any) => {
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

                {/* KYC submission documents */}
                {(() => {
                  const kyc = kycSubmissions.find((k: any) => k.user_id === selectedUserId);
                  if (!kyc) return null;
                  const docs = [
                    { label: "Government ID", url: kyc.government_id_url, type: kyc.government_id_type },
                    { label: "Live Selfie", url: kyc.selfie_url },
                    { label: "Proof of Address", url: kyc.proof_of_address_url },
                  ].filter((d) => d.url);
                  return (
                    <Card className="border-border/50 shadow-card">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" /> KYC Submission Documents
                          <Badge variant="outline" className="capitalize ml-2">{kyc.kyc_status}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {kyc.nin_or_bvn && <div><span className="text-muted-foreground">{kyc.nin_bvn_type || "NIN/BVN"}: </span><span className="font-medium text-foreground">{kyc.nin_or_bvn}</span></div>}
                          {kyc.residential_address && <div><span className="text-muted-foreground">Address: </span><span className="font-medium text-foreground">{kyc.residential_address}</span></div>}
                          {kyc.bank_name && <div><span className="text-muted-foreground">Bank: </span><span className="font-medium text-foreground">{kyc.bank_name}</span></div>}
                          {kyc.account_number && <div><span className="text-muted-foreground">Account #: </span><span className="font-medium text-foreground">{kyc.account_number}</span></div>}
                          {kyc.phone_verified !== null && <div><span className="text-muted-foreground">Phone Verified: </span><span className="font-medium text-foreground">{kyc.phone_verified ? "✅ Yes" : "❌ No"}</span></div>}
                        </div>
                        {docs.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            {docs.map((d) => (
                              <div key={d.label} className="border border-border rounded-lg p-2">
                                <p className="text-xs font-semibold text-foreground mb-1">{d.label}{d.type ? ` (${d.type})` : ""}</p>
                                {d.url!.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <a href={d.url!} target="_blank" rel="noopener noreferrer">
                                    <img src={d.url!} alt={d.label} className="w-full h-32 object-cover rounded border border-border" />
                                  </a>
                                ) : (
                                  <a href={d.url!} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View document
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {kyc.kyc_status === "pending" && selectedUserProfile && !selectedUserProfile.kyc_verified && (
                          <Button
                            onClick={() => handleVerifyKyc(selectedUserProfile.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-3"
                          >
                            <CheckCircle className="h-4 w-4" /> Verify Agent (Approve KYC)
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

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
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
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
                {properties.filter((p) => p.status === "under_verification").map((p) => {
                  const agentProfile = profiles.find((pr: any) => pr.id === p.agent_id);
                  const docs = propertyDocs.filter((d: any) => d.property_id === p.id);
                  return (
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
                          <p className="text-sm text-muted-foreground">{p.city}, {p.state}</p>
                          {(p.latitude != null && p.longitude != null) && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline inline-flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View pinned location
                            </a>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p><strong className="text-foreground">Agent:</strong> {agentProfile?.full_name || p.profiles?.full_name || "—"}</p>
                            {agentProfile?.phone && <p><strong className="text-foreground">Phone:</strong> {agentProfile.phone}</p>}
                            <p>
                              <strong className="text-foreground">KYC:</strong>{" "}
                              {agentProfile?.kyc_verified ? <span className="text-[hsl(var(--success))]">Verified</span> : <span className="text-[hsl(var(--warning))]">Not verified</span>}
                            </p>
                          </div>
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
                      <div className="border-t border-border p-4 bg-muted/30">
                        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Property Documents ({docs.length})
                        </p>
                        {docs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No documents uploaded</p>
                        ) : (
                          <div className="space-y-1">
                            {docs.map((d: any) => (
                              <a
                                key={d.id}
                                href={d.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 hover:border-secondary/50 transition-colors text-xs"
                              >
                                <FileText className="h-4 w-4 text-secondary shrink-0" />
                                <span className="flex-1 truncate text-foreground">{d.file_name}</span>
                                <span className="text-muted-foreground">{((d.file_size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

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

            {/* SUPPORT MESSAGES TAB */}
            {tab === "support" && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">Support Messages</h2>
                {supportTickets.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No support messages yet.</p>
                ) : (
                  <div className="space-y-3">
                    {supportTickets.map((ticket: any) => (
                      <Card key={ticket.id} className={`border-border/50 ${ticket.status === "open" ? "bg-card" : "bg-muted/30"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {ticket.status === "open" ? (
                                  <Mail className="h-4 w-4 text-destructive shrink-0" />
                                ) : (
                                  <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <p className="font-medium text-foreground text-sm truncate">{ticket.subject}</p>
                                <Badge variant={ticket.status === "open" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                                  {ticket.status === "open" ? "Unread" : "Read"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                From: <strong>{ticket.name || "Unknown"}</strong> ({ticket.email || "No email"}) • {new Date(ticket.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.message}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              {ticket.status === "open" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1"
                                  onClick={async () => {
                                    await (supabase as any).from("support_tickets").update({ status: "read" }).eq("id", ticket.id);
                                    toast.success("Marked as read");
                                    loadData();
                                  }}
                                >
                                  <MailOpen className="h-3 w-3" /> Mark Read
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1"
                                onClick={() => {
                                  if (ticket.email) {
                                    window.open(`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(ticket.subject)}`, "_blank");
                                  } else {
                                    toast.error("No email address available");
                                  }
                                }}
                              >
                                <Mail className="h-3 w-3" /> Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs gap-1"
                                onClick={async () => {
                                  if (!window.confirm("Delete this support message?")) return;
                                  await (supabase as any).from("support_tickets").delete().eq("id", ticket.id);
                                  toast.success("Message deleted");
                                  loadData();
                                }}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {tab === "announcements" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">Manage Announcements</h2>
                  <Button
                    size="sm"
                    className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={() => { setShowAnnForm(true); setEditingAnnId(null); setAnnForm({ title: "", content: "", type: "update" }); }}
                  >
                    <Plus className="h-4 w-4" /> New Announcement
                  </Button>
                </div>

                {showAnnForm && (
                  <Card className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground">{editingAnnId ? "Edit Announcement" : "Create Announcement"}</h3>
                      <div>
                        <label className="text-sm font-medium text-foreground">Title</label>
                        <input className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Announcement title" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Type</label>
                        <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={annForm.type} onChange={(e) => setAnnForm({ ...annForm, type: e.target.value })}>
                          <option value="update">Platform Update</option>
                          <option value="announcement">Announcement</option>
                          <option value="alert">Maintenance Notice</option>
                          <option value="promotion">Property Promotion</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Content</label>
                        <textarea className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" rows={4} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Write announcement content..." />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowAnnForm(false); setEditingAnnId(null); }}>Cancel</Button>
                        <Button
                          size="sm"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          disabled={!annForm.title.trim() || !annForm.content.trim()}
                          onClick={async () => {
                            if (!user) return;
                            // Get admin's profile id
                            const { data: adminProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
                            if (!adminProfile) { toast.error("Profile not found"); return; }

                            if (editingAnnId) {
                              const { error } = await (supabase as any).from("announcements").update({ title: annForm.title, content: annForm.content, type: annForm.type }).eq("id", editingAnnId);
                              if (error) toast.error(error.message);
                              else toast.success("Announcement updated");
                            } else {
                              const { error } = await (supabase as any).from("announcements").insert({ title: annForm.title, content: annForm.content, type: annForm.type, author_id: adminProfile.id });
                              if (error) toast.error(error.message);
                              else toast.success("Announcement created");
                            }
                            setShowAnnForm(false);
                            setEditingAnnId(null);
                            loadData();
                          }}
                        >
                          {editingAnnId ? "Save Changes" : "Publish"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {dbAnnouncements.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No announcements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {dbAnnouncements.map((a: any) => (
                      <Card key={a.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Megaphone className="h-4 w-4 text-secondary shrink-0" />
                                <p className="font-medium text-foreground text-sm truncate">{a.title}</p>
                                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{a.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {a.profiles?.full_name ? `By ${a.profiles.full_name} · ` : ""}
                                {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1"
                                onClick={() => {
                                  setAnnForm({ title: a.title, content: a.content, type: a.type || "update" });
                                  setEditingAnnId(a.id);
                                  setShowAnnForm(true);
                                }}
                              >
                                <Edit3 className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-xs gap-1"
                                onClick={async () => {
                                  if (!window.confirm("Delete this announcement?")) return;
                                  const { error } = await (supabase as any).from("announcements").delete().eq("id", a.id);
                                  if (error) {
                                    toast.error(error.message);
                                    return;
                                  }
                                  toast.success("Announcement deleted");
                                  loadData();
                                }}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EARNINGS TAB */}
            {tab === "earnings" && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-foreground">Earnings Overview</h2>
                
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <GlassCard icon={DollarSign} label="Total Distributed" value={`₦${allEarnings.reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString()}`} />
                  <GlassCard icon={Building} label="Company Wallet" value={`₦${(companyWallet?.balance || 0).toLocaleString()}`} />
                  <GlassCard icon={TrendingUp} label="Direct Bonuses" value={`₦${allEarnings.filter((e: any) => e.type === "direct_referral").reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString()}`} />
                  <GlassCard icon={Network} label="Matrix Earnings" value={`₦${allEarnings.filter((e: any) => e.type === "matrix").reduce((s: number, e: any) => s + (e.amount || 0), 0).toLocaleString()}`} />
                  <GlassCard icon={Wallet} label="Held in Escrow" value={`₦${escrowHolds.filter((h: any) => h.status === "held").reduce((s: number, h: any) => s + (h.amount || 0), 0).toLocaleString()}`} />
                </div>

                {/* Per-subscription distribution view */}
                <Card className="border-border/50 shadow-card">
                  <CardHeader><CardTitle className="text-base">Distribution Per Subscription</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      const bySub: Record<string, any[]> = {};
                      allEarnings.filter((e: any) => e.transaction_id).forEach((e: any) => {
                        (bySub[e.transaction_id] ||= []).push(e);
                      });
                      const subs = Object.entries(bySub).slice(0, 10);
                      if (subs.length === 0) return <p className="text-muted-foreground text-sm">No subscription distributions yet.</p>;
                      return (
                        <div className="space-y-3">
                          {subs.map(([subId, items]) => {
                            const total = items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                            const subscriber = items.find((i: any) => i.from_user_id);
                            const subProfile = profiles.find((p: any) => p.user_id === subscriber?.from_user_id);
                            return (
                              <div key={subId} className="p-3 rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-foreground">From: {subProfile?.full_name || "Unknown"}</p>
                                  <Badge variant="outline">₦{total.toLocaleString()} distributed</Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                                  {items.filter((i: any) => i.amount > 0).sort((a: any, b: any) => (a.level || 0) - (b.level || 0)).map((i: any) => {
                                    const recipient = profiles.find((p: any) => p.user_id === i.user_id);
                                    return (
                                      <div key={i.id} className="px-2 py-1 rounded bg-muted/50">
                                        L{i.level} · {recipient?.full_name?.split(" ")[0] || "?"} · <strong>₦{i.amount.toLocaleString()}</strong>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Top Earning Agents */}
                <Card className="border-border/50 shadow-card">
                  <CardHeader><CardTitle className="text-base">Top Earning Agents</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      const agentTotals: Record<string, number> = {};
                      allEarnings.forEach((e: any) => {
                        agentTotals[e.user_id] = (agentTotals[e.user_id] || 0) + (e.amount || 0);
                      });
                      const sorted = Object.entries(agentTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
                      if (sorted.length === 0) return <p className="text-muted-foreground text-sm">No earnings data yet.</p>;
                      return (
                        <div className="space-y-2">
                          {sorted.map(([uid, total], i) => {
                            const p = profiles.find((pr: any) => pr.user_id === uid);
                            return (
                              <div key={uid} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                                  <span className="text-sm font-medium text-foreground">{p?.full_name || "Unknown"}</span>
                                </div>
                                <span className="font-bold text-foreground">₦{total.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Referral Tree */}
                <Card className="border-border/50 shadow-card">
                  <CardHeader><CardTitle className="text-base">Referral Tree (Who Referred Who)</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      const referrers = profiles.filter((p: any) => p.referral_code);
                      const tree = referrers.map((r: any) => {
                        const referred = profiles.filter((p: any) => p.referred_by === r.id);
                        return { referrer: r, referred };
                      }).filter(t => t.referred.length > 0);
                      if (tree.length === 0) return <p className="text-muted-foreground text-sm">No referrals yet.</p>;
                      return (
                        <div className="space-y-3">
                          {tree.map(({ referrer, referred }) => (
                            <div key={referrer.id} className="p-3 rounded-lg border border-border">
                              <p className="font-medium text-foreground text-sm">{referrer.full_name} <span className="text-muted-foreground">({referrer.referral_code})</span></p>
                              <div className="mt-2 ml-4 space-y-1">
                                {referred.map((ref: any) => (
                                  <p key={ref.id} className="text-xs text-muted-foreground">↳ {ref.full_name} ({ref.profile_type})</p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* All Earnings Log */}
                <Card className="border-border/50 shadow-card">
                  <CardHeader><CardTitle className="text-base">All Earnings Log</CardTitle></CardHeader>
                  <CardContent>
                    {allEarnings.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No earnings recorded.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="text-left py-2 px-3 font-medium">Date</th>
                              <th className="text-left py-2 px-3 font-medium">Agent</th>
                              <th className="text-left py-2 px-3 font-medium">Type</th>
                              <th className="text-left py-2 px-3 font-medium">Description</th>
                              <th className="text-right py-2 px-3 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allEarnings.map((e: any) => {
                              const p = profiles.find((pr: any) => pr.user_id === e.user_id);
                              return (
                                <tr key={e.id} className="border-b border-border/50">
                                  <td className="py-2 px-3">{new Date(e.created_at).toLocaleDateString()}</td>
                                  <td className="py-2 px-3">{p?.full_name || "Unknown"}</td>
                                  <td className="py-2 px-3">
                                    <Badge variant="outline" className="text-xs">{e.type?.replace(/_/g, " ")}</Badge>
                                  </td>
                                  <td className="py-2 px-3 text-muted-foreground">{e.description || "—"}</td>
                                  <td className="py-2 px-3 text-right font-bold">₦{(e.amount || 0).toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SUBSCRIPTIONS TAB */}
            {tab === "subscriptions" && (
              <div className="space-y-6">
                <Card className="border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-4 w-4 text-secondary" /> Subscription Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subRequests.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No subscription requests yet</p>
                    ) : (
                      <div className="space-y-4">
                        {subRequests.map((req: any) => {
                          const p = profiles.find((pr: any) => pr.user_id === req.user_id);
                          return (
                            <div key={req.id} className="border border-border rounded-xl p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{p?.full_name || "Unknown Agent"}</p>
                                  <p className="text-xs text-muted-foreground">Submitted: {new Date(req.created_at).toLocaleDateString()}</p>
                                  {req.note && <p className="text-sm text-muted-foreground mt-1">Note: {req.note}</p>}
                                  <Badge className={`mt-2 text-xs ${req.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : req.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                    {req.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-1 w-full">
                                      <Eye className="h-3 w-3" /> View Screenshot
                                    </Button>
                                  </a>
                                  {req.status === "pending" && (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleApproveSubscription(req.id, req.user_id)} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <CheckCircle className="h-3 w-3" /> Approve
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleRejectSubscription(req.id, req.user_id)} className="gap-1">
                                        <XCircle className="h-3 w-3" /> Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {/* ACTIVE DEALS TAB */}
            {tab === "active-deals" && (
              <div className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle className="h-4 w-4 text-primary" /> Active Deal Chats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeDealThreads.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No active deal chats yet</p>
                    ) : (
                      <div className="space-y-3">
                        {activeDealThreads.map((t: any) => (
                          <div key={t.id} className="border border-border rounded-xl p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {t.buyer_name} ↔ {t.agent_name}
                                </p>
                                <p className="text-xs text-muted-foreground">Property: {t.property_title}</p>
                                <p className="text-xs text-muted-foreground">Messages: {t.message_count} • Started: {new Date(t.created_at).toLocaleDateString()}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={async () => {
                                  setSelectedDealId(t.id);
                                  const { data } = await supabase
                                    .from("messages")
                                    .select("*")
                                    .eq("thread_id", t.id)
                                    .order("created_at", { ascending: true });
                                  setSelectedDealMessages(data || []);
                                }}
                              >
                                <Eye className="h-3 w-3" /> View Chat
                              </Button>
                            </div>
                            {selectedDealId === t.id && selectedDealMessages.length > 0 && (
                              <div className="mt-4 border-t border-border pt-3 max-h-64 overflow-y-auto space-y-2">
                                {selectedDealMessages.map((msg: any) => {
                                  const senderProfile = profiles.find((p: any) => p.id === msg.sender_id);
                                  return (
                                    <div key={msg.id} className={`text-sm p-2 rounded-lg ${msg.is_blocked ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                                      <span className="font-medium text-foreground">{senderProfile?.full_name || "Unknown"}: </span>
                                      <span>{msg.content}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* WITHDRAWALS TAB */}
            {tab === "withdrawals" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-foreground">Withdrawal Requests</h2>
                  <Badge variant="outline">{withdrawals.filter((w: any) => w.status === "pending").length} pending</Badge>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bank</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.length === 0 && (
                          <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No withdrawal requests yet</td></tr>
                        )}
                        {withdrawals.map((w: any) => {
                          const wUser = profiles.find((p: any) => p.user_id === w.user_id);
                          return (
                            <tr key={w.id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-medium text-foreground">{wUser?.full_name || "Unknown"}</td>
                              <td className="px-4 py-3 font-bold text-emerald-600">₦{(w.amount || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-foreground">{w.bank_name}</td>
                              <td className="px-4 py-3 text-foreground text-xs">{w.account_number}<br/><span className="text-muted-foreground">{w.account_name}</span></td>
                              <td className="px-4 py-3">
                                <Badge className={`text-xs ${
                                  w.status === "pending" ? "bg-amber-100 text-amber-700" :
                                  w.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{w.status}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                {w.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        const { error } = await (supabase as any).from("withdrawals").update({
                                          status: "approved",
                                          reviewed_by: user?.id,
                                          reviewed_at: new Date().toISOString(),
                                        }).eq("id", w.id);
                                        if (error) { toast.error(error.message); return; }
                                        await (supabase as any).from("notifications").insert({
                                          user_id: w.user_id,
                                          title: "Withdrawal Approved ✅",
                                          message: `Your withdrawal of ₦${w.amount.toLocaleString()} has been approved and is being processed.`,
                                          type: "success",
                                          link: "/earnings",
                                        });
                                        toast.success("Withdrawal approved");
                                        loadData();
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={async () => {
                                        const reason = prompt("Reason for rejection:");
                                        if (!reason) return;
                                        const { error } = await (supabase as any).from("withdrawals").update({
                                          status: "rejected",
                                          admin_note: reason,
                                          reviewed_by: user?.id,
                                          reviewed_at: new Date().toISOString(),
                                        }).eq("id", w.id);
                                        if (error) { toast.error(error.message); return; }
                                        await (supabase as any).from("notifications").insert({
                                          user_id: w.user_id,
                                          title: "Withdrawal Rejected",
                                          message: `Your withdrawal of ₦${w.amount.toLocaleString()} was rejected. Reason: ${reason}`,
                                          type: "warning",
                                          link: "/earnings",
                                        });
                                        toast.success("Withdrawal rejected");
                                        loadData();
                                      }}
                                      className="gap-1"
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Reject
                                    </Button>
                                  </div>
                                )}
                                {w.status !== "pending" && w.admin_note && (
                                  <span className="text-xs text-muted-foreground">{w.admin_note}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* REFERRAL TREES TAB */}
            {tab === "referrals" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-foreground">Referral Trees</h2>
                  {selectedReferralUserId && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReferralUserId(null)}>← All Users</Button>
                  )}
                </div>

                {!selectedReferralUserId ? (
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Referral Code</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Direct Referrals</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profiles.filter((p: any) => p.profile_type === "agent" || p.referral_code).map((p: any) => {
                            const directs = profiles.filter((x: any) => x.referred_by === p.id).length;
                            return (
                              <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
                                <td className="px-4 py-3"><Badge variant="outline" className="capitalize text-xs">{p.profile_type}</Badge></td>
                                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.referral_code || "—"}</td>
                                <td className="px-4 py-3 font-bold text-foreground">{directs}</td>
                                <td className="px-4 py-3">
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedReferralUserId(p.id)}>
                                    <Network className="h-3.5 w-3.5" /> View Tree
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Tree for: {profiles.find((p: any) => p.id === selectedReferralUserId)?.full_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReferralTree rootProfileId={selectedReferralUserId} />
                    </CardContent>
                  </Card>
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
