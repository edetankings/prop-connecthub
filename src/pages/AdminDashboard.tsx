import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle, XCircle, FileText, LayoutDashboard, Gavel, ScrollText, DollarSign, Wallet, PieChart, Activity, Eye, CalendarCheck, Trash2, MessageSquare, Mail, MailOpen, Megaphone, Edit3, Plus, CreditCard, Network } from "lucide-react";
import { MessageCircle } from "lucide-react";
import OperationsOverview from "@/components/admin/OperationsOverview";
import UserDirectory from "@/components/admin/UserDirectory";
import Inspections from "@/pages/Inspections";
import DealsList from "@/pages/DealsList";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ReferralTree from "@/components/ReferralTree";
import { SignedBucketAsset } from "@/components/SignedBucketAsset";
import logo from "@/assets/logo.jpg";
import { toast } from "sonner";
import { useFinancialAvailability } from "@/hooks/useFinancialAvailability";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Tab = "dashboard" | "matrix" | "users" | "moderation" | "disputes" | "audit" | "verification" | "reservations" | "support" | "announcements" | "earnings" | "subscriptions" | "active-deals" | "withdrawals" | "referrals";

const AdminDashboard = () => {
  const finance = useFinancialAvailability();
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loadError, setLoadError] = useState(false);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [propertyFilter, setPropertyFilter] = useState("pending");
  const [decision, setDecision] = useState<{ title: string; description: string; reasonRequired: boolean; action: (reason: string) => Promise<void> } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const decisionLock = useRef(false);
  const askDecision = (title: string, description: string, action: (reason: string) => Promise<void>, reasonRequired = false) => {
    setDecisionReason(""); setDecisionError(""); setDecision({ title, description, action, reasonRequired });
  };
  const confirmDecision = async () => {
    if (!decision || decisionLock.current || decision.reasonRequired && !decisionReason.trim()) return;
    decisionLock.current = true; setDecisionBusy(true); setDecisionError("");
    try { await decision.action(decisionReason.trim()); setDecision(null); toast.success("Review saved"); void loadData(); }
    catch { setDecisionError("Unable to save this decision. No successful update was confirmed. Please retry."); }
    finally { decisionLock.current = false; setDecisionBusy(false); }
  };
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

  useEffect(() => {
    const view = searchParams.get("view");
    if (["users", "verification", "moderation", "audit", "reservations", "active-deals", "support", "announcements", "matrix", "referrals", "subscriptions"].includes(view || "")) setTab(view as Tab);
    else setTab("dashboard");
    setSelectedUserId(null);
  }, [searchParams]);

  useEffect(() => {
    if (!user?.id || !isAdmin) return;
    supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAdminProfileId(data?.id ?? null));
  }, [user?.id, isAdmin]);

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
    const { data: existing, error: existingError } = await supabase
      .from("chat_threads")
      .select("id")
      .or(
        `and(buyer_id.eq.${adminProfileId},agent_id.eq.${targetProfileId}),and(buyer_id.eq.${targetProfileId},agent_id.eq.${adminProfileId})`
      )
      .limit(1)
      .maybeSingle();

    if (existingError) { toast.error("Unable to find your conversation. Please retry."); return; }

    if (existing?.id) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("chat_threads")
      .insert({ buyer_id: adminProfileId, agent_id: targetProfileId, status: "restricted" } as any)
      .select("id")
      .maybeSingle();

    if (error || !created) {
      toast.error(error?.message || "Failed to start chat");
      return;
    }
    navigate(`/chat/${created.id}`);
  };

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setLoadError(false);
    try {
    const [p, pr, v, d, a, t, ks] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("verification_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("verification_steps").select("*").order("created_at", { ascending: true }),
    ]);
    if ([p, pr, v, d, a, t, ks].some(result => result.error)) throw new Error("Operations unavailable");
    const roleResult = await supabase.from("user_roles").select("user_id, role");
    if (roleResult.error) throw roleResult.error;
    setRoles(roleResult.data || []);
    setProfiles(p.data || []);
    setProperties(pr.data || []);
    setVerifications(v.data || []);
    setDisputes(d.data || []);
    setAuditLogs(a.data || []);
    setTransactions(t.data || []);
    setKycSteps(ks.data || []);

    // Fetch all reservations for admin
    const { data: resData, error: resDataError } = await (supabase as any)
      .from("reservations")
      .select("*, properties(title, city, state)")
      .order("created_at", { ascending: false });
    if (resDataError) throw resDataError;
    setAllReservations(resData || []);

    const { data: ticketsData, error: ticketsDataError } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (ticketsDataError) throw ticketsDataError;
    setSupportTickets(ticketsData || []);

    const { data: annData, error: annDataError } = await (supabase as any)
      .from("announcements")
      .select("*, profiles!announcements_author_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    if (annDataError) throw annDataError;
    setDbAnnouncements(annData || []);

    const { data: earningsData, error: earningsDataError } = await (supabase as any)
      .from("earnings")
      .select("*")
      .order("created_at", { ascending: false });
    if (earningsDataError) throw earningsDataError;
    setAllEarnings(earningsData || []);

    const { data: docsData, error: docsDataError } = await (supabase as any)
      .from("property_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (docsDataError) throw docsDataError;
    setPropertyDocs(docsData || []);

    const { data: subReqData, error: subReqDataError } = await (supabase as any)
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (subReqDataError) throw subReqDataError;
    setSubRequests(subReqData || []);

    const { data: subsData, error: subsDataError } = await (supabase as any)
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (subsDataError) throw subsDataError;
    setAllSubscriptions(subsData || []);

    const { data: wdData, error: wdDataError } = await (supabase as any)
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });
    if (wdDataError) throw wdDataError;
    setWithdrawals(wdData || []);

    // KYC submissions (full documents)
    const { data: kycData, error: kycDataError } = await (supabase as any)
      .from("kyc_verifications")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (kycDataError) throw kycDataError;
    setKycSubmissions(kycData || []);

    // Company wallet
    const { data: cwData, error: cwDataError } = await (supabase as any)
      .from("company_wallet")
      .select("balance, total_earned")
      .maybeSingle();
    if (cwDataError) throw cwDataError;
    setCompanyWallet(cwData || null);

    // Escrow holds
    const { data: escData, error: escDataError } = await (supabase as any)
      .from("escrow_holds")
      .select("*")
      .order("created_at", { ascending: false });
    if (escDataError) throw escDataError;
    setEscrowHolds(escData || []);

    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleVerifyKyc = (profileId: string) => {
    const target = profiles.find(profile => profile.id === profileId);
    if (!target) return;
    askDecision("Approve KYC submission", "Review the applicant's private documents before confirming. Existing database triggers and authorization remain authoritative.", async () => {
      const { data, error } = await supabase.from("kyc_verifications").update({ kyc_status: "verified", rejection_reason: null }).eq("user_id", target.user_id).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
    });
  };
  const handleRejectKyc = (profileId: string) => {
    const target = profiles.find(profile => profile.id === profileId);
    if (!target) return;
    askDecision("Reject KYC submission", "The recorded reason will be available to the applicant through the existing review workflow.", async reason => {
      const { data, error } = await supabase.from("kyc_verifications").update({ kyc_status: "rejected", rejection_reason: reason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("user_id", target.user_id).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
    }, true);
  };
  const handleDocumentReview = (docId: string, status: "approved" | "rejected") => {
    askDecision(`${status === "approved" ? "Approve" : "Reject"} verification document`, "This updates only the existing document review status.", async () => {
      const { data, error } = await supabase.from("verification_documents").update({ status }).eq("id", docId).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
    });
  };
  const handleApproveProperty = (propertyId: string) => {
    askDecision("Approve property listing", "Confirm the listing meets the existing moderation requirements. Database eligibility checks still apply; approval does not enable payments.", async () => {
      const { data, error } = await supabase.from("properties").update({ status: "available", is_verified: true }).eq("id", propertyId).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
    });
  };
  const handleRejectProperty = (propertyId: string) => {
    askDecision("Return listing to draft", "The existing workflow returns the listing to draft. A persisted property rejection-reason field is not supported, so no reason is requested or promised.", async () => {
      const { data, error } = await supabase.from("properties").update({ status: "draft" }).eq("id", propertyId).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
    });
  };

  const handleDisputeStatus = (disputeId: string, status: "resolved" | "rejected") => {
    askDecision("Record dispute review", "This records a non-financial resolution only. It does not refund, release or transfer funds.", async reason => {
      const { error } = await supabase.rpc("resolve_dispute", { _dispute_id: disputeId, _status: status, _resolution: reason });
      if (error) throw error;
    }, true);
  };

  const handleKycStepReview = (stepId: string, stepUserId: string, stepName: string, status: "approved" | "rejected") => {
    askDecision(`${status === "approved" ? "Approve" : "Reject"} verification step`, "This reviews the submitted step only. It does not replace an overall KYC decision.", async reason => {
      const { data, error } = await supabase.from("verification_steps").update({ status, ...(reason ? { rejection_reason: reason } : {}) }).eq("id", stepId).select("id");
      if (error || !data?.length) throw new Error("Review not saved");
      try {
        const notification = await supabase.from("notifications").insert({ user_id: stepUserId, title: status === "approved" ? "Verification Step Approved" : "Verification Step Declined", message: `Your ${stepName.replace(/_/g, " ")} verification was ${status}.${reason ? ` Reason: ${reason}` : ""}`, type: status === "approved" ? "success" : "error", link: "/verification" });
        if (notification.error) toast.warning("The review was saved, but its notification could not be confirmed.");
      } catch { toast.warning("The review was saved, but its notification could not be confirmed."); }
    }, status === "rejected");
  };

  const handleToggleVisibility = (profileId: string, currentlyVisible: boolean) => {
    askDecision(currentlyVisible ? "Hide directory entry" : "Show directory entry", "This changes the existing public agent-directory visibility preference only, not account access or roles.", async () => {
      const { data, error } = await supabase.from("profiles").update({ is_visible: !currentlyVisible }).eq("id", profileId).select("id");
      if (error || !data?.length) throw new Error("Visibility not saved");
    });
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
    if (!finance.enabled) { toast.error(finance.unavailableMessage); return; }
    const reference = prompt("Verified provider-namespaced payment reference:");
    const endDate = prompt("Approved subscription end date (ISO date/time):");
    if (!reference?.trim() || !endDate || !Number.isFinite(Date.parse(endDate))) return;
    const { error } = await (supabase as any).rpc("activate_subscription", {
      _request_id: requestId, _end_date: new Date(endDate).toISOString(), _payment_reference: reference.trim(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Subscription approved!");
    loadData();
  };

  const handleRejectSubscription = async (requestId: string, reqUserId: string) => {
    const reason = prompt("Rejection reason (optional):");
    if (reason === null) return;
    const { error } = await (supabase as any).rpc("reject_subscription_request", { _request_id: requestId, _reason: reason });
    if (error) { toast.error(error.message); return; }
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
    { id: "verification" as Tab, label: "Verification Requests", icon: ShieldCheck, count: pendingVerificationUsers.length },
    { id: "users" as Tab, label: "Users", icon: Users },
    { id: "moderation" as Tab, label: "Properties", icon: FileText, count: pendingProperties },
    { id: "disputes" as Tab, label: "Disputes", icon: Gavel, count: openDisputes },
    { id: "audit" as Tab, label: "Audit Logs", icon: ScrollText },
    { id: "reservations" as Tab, label: "Reservations", icon: CalendarCheck, count: allReservations.filter((r: any) => r.inspection_status === "requested").length },
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

  if (!isAdmin) return null;

  return (
    <AuthenticatedLayout>
      <div className="operations-page">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="PROP-connect" className="h-12 w-12 rounded-xl object-contain" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Operations console</h1>
            <p className="text-sm text-muted-foreground">Review people, properties and platform activity.</p>
            {!finance.enabled && <p role="status" className="text-sm text-muted-foreground">{finance.unavailableMessage}</p>}
          </div>
        </div>

        {/* Tabs */}
        <nav aria-label="Operation sections" className="operations-tabs">
          {tabs.filter(t => !["earnings", "subscriptions", "withdrawals"].includes(t.id)).map((t) => (
            <Button
              key={t.id}
              aria-current={tab === t.id ? "page" : undefined}
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
        </nav>

        {loadError ? <div role="alert" className="buyer-empty"><h2>Operations unavailable</h2><p>Some authorized records could not be retrieved. Incomplete results are not shown.</p><Button variant="outline" onClick={() => void loadData()}>Retry operations</Button></div> : loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {tab === "dashboard" && <OperationsOverview />}

            {/* MATRIX OVERVIEW TAB */}
            {tab === "matrix" && (() => {
              const totalSubscribers = profiles.filter((p: any) => allSubscriptions.some((s: any) => s.user_id === p.user_id)).length;
              const activeSubscribers = allSubscriptions.filter((s: any) => s.status === "active" && new Date(s.end_date) >= new Date()).length;
              const totalDistributed = allEarnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
              const pendingPayouts = escrowHolds.filter((h: any) => h.status === "held").reduce((s: number, h: any) => s + (h.amount || 0), 0);

              const agentTotals: Record<string, number> = {};
              allEarnings.forEach((e: any) => {
                if (!e.user_id) return;
                agentTotals[e.user_id] = (agentTotals[e.user_id] || 0) + (e.amount || 0);
              });
              const topEarners = Object.entries(agentTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

              const recentEarnings = [...allEarnings]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 15);

              return (
                <div className="space-y-6">
                  <h2 className="font-display text-xl font-bold text-foreground">2x2 Matrix Overview</h2>

                  {/* Stat Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/50 shadow-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Total Subscribers</p>
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="font-display text-3xl font-bold text-foreground">{totalSubscribers}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Active Subscribers</p>
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                        </div>
                        <p className="font-display text-3xl font-bold text-foreground">{activeSubscribers}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Total Distributed</p>
                          <DollarSign className="h-4 w-4 text-secondary" />
                        </div>
                        <p className="font-display text-3xl font-bold text-foreground">₦{totalDistributed.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Pending Payouts</p>
                          <Wallet className="h-4 w-4 text-[hsl(var(--warning))]" />
                        </div>
                        <p className="font-display text-3xl font-bold text-foreground">₦{pendingPayouts.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Top Earners */}
                    <Card className="border-border/50 shadow-card">
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top Earners</CardTitle></CardHeader>
                      <CardContent>
                        {topEarners.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No earnings yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {topEarners.map(([uid, total], i) => {
                              const p = profiles.find((pr: any) => pr.user_id === uid);
                              return (
                                <div key={uid} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                                    <span className="text-sm font-medium text-foreground truncate">{p?.full_name || "Unknown"}</span>
                                  </div>
                                  <span className="font-bold text-foreground whitespace-nowrap">₦{total.toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Transactions */}
                    <Card className="border-border/50 shadow-card">
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Transactions</CardTitle></CardHeader>
                      <CardContent>
                        {recentEarnings.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No transactions yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {recentEarnings.map((e: any) => {
                              const recipient = profiles.find((p: any) => p.user_id === e.user_id);
                              const fromUser = profiles.find((p: any) => p.user_id === e.from_user_id);
                              return (
                                <div key={e.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-border/60 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground truncate">{recipient?.full_name || "Unknown"}</p>
                                    <p className="text-muted-foreground">
                                      {e.type === "matrix" ? `Matrix L${e.level}` : e.type.replace(/_/g, " ")}
                                      {fromUser && ` · from ${fromUser.full_name?.split(" ")[0]}`}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70">{new Date(e.created_at).toLocaleString()}</p>
                                  </div>
                                  <span className="font-bold text-secondary whitespace-nowrap">₦{(e.amount || 0).toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-user 2x2 tree quick browse */}
                  <Card className="border-border/50 shadow-card">
                    <CardHeader><CardTitle className="text-base">Browse Agent Matrix Tree</CardTitle></CardHeader>
                    <CardContent>
                      {selectedReferralUserId ? (
                        <div className="space-y-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedReferralUserId(null)}> Back to list</Button>
                          <ReferralTree rootProfileId={selectedReferralUserId} />
                        </div>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto">
                          {profiles.filter((p: any) => p.profile_type === "agent").map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedReferralUserId(p.id)}
                              className="text-left p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
                            >
                              <p className="font-medium text-sm text-foreground">{p.full_name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{p.referral_code || "No code"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

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
                              <td data-label="User Name" className="px-4 py-3 font-medium text-foreground">{userProfile?.full_name || "Unknown"}</td>
                              <td data-label="Role" className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">{userProfile?.profile_type || "—"}</Badge>
                              </td>
                              <td data-label="Progress" className="px-4 py-3">
                                <span className="text-foreground font-medium">{approved}/{userSteps.length}</span>
                                <span className="text-muted-foreground ml-1">steps</span>
                              </td>
                              <td data-label="Pending" className="px-4 py-3">
                                {pending > 0 ? (
                                  <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-0">{pending} pending</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                              <td data-label="Status" className="px-4 py-3">
                                {userProfile?.kyc_verified ? (
                                  <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0">Verified</Badge>
                                ) : pending > 0 ? (
                                  <Badge className="bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-0">Pending Review</Badge>
                                ) : (
                                  <Badge variant="outline">In Progress</Badge>
                                )}
                              </td>
                              <td data-label="Date" className="px-4 py-3 text-xs text-muted-foreground">
                                {latestStep ? new Date(latestStep.updated_at).toLocaleDateString() : "—"}
                              </td>
                              <td data-label="Actions" className="px-4 py-3">
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
                  {kycSteps.length === 0 && kycSubmissions.length === 0 && <p className="p-8 text-center text-muted-foreground">No verification data</p>}
                </div>
              </div>
            )}

            {/* VERIFICATION DETAIL VIEW */}
            {tab === "verification" && selectedUserId && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}> Back</Button>
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
                                <SignedBucketAsset
                                  bucket="verification-docs"
                                  value={d.url}
                                  label={d.label}
                                  imgClassName="w-full h-32 object-cover rounded border border-border"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {kyc.kyc_status === "pending" && selectedUserProfile && !selectedUserProfile.kyc_verified && (
                          <div className="flex flex-col md:flex-row gap-2 mt-3">
                            <Button
                              onClick={() => handleVerifyKyc(selectedUserProfile.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                              <CheckCircle className="h-4 w-4" /> Verify Agent (Approve KYC)
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleRejectKyc(selectedUserProfile.id)}
                              className="flex-1 gap-2"
                            >
                              <XCircle className="h-4 w-4" /> Reject KYC (with reason)
                            </Button>
                          </div>
                        )}
                        {kyc.kyc_status === "rejected" && kyc.rejection_reason && (
                          <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
                            <p className="font-semibold text-destructive mb-1">Previously rejected</p>
                            <p className="text-foreground">{kyc.rejection_reason}</p>
                          </div>
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
                                <SignedBucketAsset
                                  bucket="verification-docs"
                                  value={step.document_url}
                                  label="uploaded document"
                                />
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
                                onClick={() => handleKycStepReview(step.id, step.user_id, step.step_name, "rejected")}
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

            {tab === "users" && <UserDirectory profiles={profiles} roles={roles} onReview={userId => { setTab("verification"); setSelectedUserId(userId); }} onVisibility={handleToggleVisibility} onChat={profileId => void handleAdminChat(profileId)} />}

            {/* MODERATION / PROPERTY MONITORING TAB */}
            {tab === "moderation" && (() => {
              const total = properties.length;
              const pending = properties.filter((p) => p.status === "under_verification").length;
              const approved = properties.filter((p) => ["available", "for_sale", "for_rent"].includes(p.status)).length;
              const rejected = properties.filter((p) => p.status === "draft").length;
              const sold = properties.filter((p) => ["sold", "rented"].includes(p.status)).length;

              const statusFilter = propertyFilter;
              const setStatusFilter = setPropertyFilter;

              const filtered = properties.filter((p) => {
                if (statusFilter === "all") return true;
                if (statusFilter === "pending") return p.status === "under_verification";
                if (statusFilter === "approved") return ["available", "for_sale", "for_rent"].includes(p.status);
                if (statusFilter === "rejected") return p.status === "draft";
                if (statusFilter === "sold") return ["sold", "rented"].includes(p.status);
                return true;
              });

              const propActivity = (pid: string) =>
                auditLogs.filter((l: any) => l.details?.property_id === pid || l.details?.id === pid);

              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">Property Monitoring</h2>
                    <p className="text-sm text-muted-foreground">Monitor every property listed on the platform.</p>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {[
                      { label: "Total", value: total, key: "all", icon: Building, color: "text-foreground" },
                      { label: "Pending", value: pending, key: "pending", icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
                      { label: "Approved", value: approved, key: "approved", icon: CheckCircle, color: "text-[hsl(var(--success))]" },
                      { label: "Draft", value: rejected, key: "rejected", icon: XCircle, color: "text-destructive" },
                      { label: "Sold/Rented", value: sold, key: "sold", icon: TrendingUp, color: "text-primary" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setStatusFilter(s.key)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          statusFilter === s.key
                            ? "border-secondary bg-secondary/10 shadow-card"
                            : "border-border bg-card hover:border-secondary/40"
                        }`}
                      >
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                        <p className="mt-2 font-display text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* Property list */}
                  {filtered.length === 0 && (
                    <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      No properties in this category
                    </p>
                  )}

                  {filtered.map((p) => {
                    const agentProfile = profiles.find((pr: any) => pr.id === p.agent_id);
                    const docs = propertyDocs.filter((d: any) => d.property_id === p.id);
                    const reservationCount = allReservations.filter((r: any) => r.property_id === p.id).length;
                    const interestedBuyers = new Set(allReservations.filter((r: any) => r.property_id === p.id).map((r: any) => r.buyer_id)).size;
                    const activity = propActivity(p.id);
                    const isPending = p.status === "under_verification";

                    const statusBadge = isPending
                      ? { label: "Pending Approval", cls: "text-[hsl(var(--warning))] border-[hsl(var(--warning))]/40" }
                      : p.status === "draft"
                      ? { label: "Draft", cls: "text-destructive border-destructive/40" }
                      : ["sold", "rented"].includes(p.status)
                      ? { label: p.status === "sold" ? "Sold" : "Rented", cls: "text-primary border-primary/40" }
                      : { label: "Approved · Live", cls: "text-[hsl(var(--success))] border-[hsl(var(--success))]/40" };

                    return (
                      <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                        <div className="flex flex-col md:flex-row">
                          {(p.image_url || p.images?.[0]) && (
                            <div className="w-full md:w-52 h-40 bg-muted shrink-0">
                              <img src={p.image_url || p.images?.[0]} alt={p.title} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="p-4 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-lg truncate">{p.title}</p>
                                <p className="text-sm text-secondary font-bold mt-0.5">₦{(p.price || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{p.city}, {p.state} · {p.property_type}</p>
                              </div>
                              <Badge variant="outline" className={statusBadge.cls}>{statusBadge.label}</Badge>
                            </div>

                            {/* Performance metrics */}
                            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-2 text-center">
                              <div>
                                <p className="font-semibold text-foreground text-sm">{reservationCount}</p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reservations</p>
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-sm">{interestedBuyers}</p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Interested</p>
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-sm">{(p.images?.length || 0) + (p.videos?.length || 0)}</p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Media</p>
                              </div>
                            </div>

                            {/* Owner / GPS / Dates */}
                            <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <p><strong className="text-foreground">Agent:</strong> {agentProfile?.full_name || p.profiles?.full_name || "—"}</p>
                              {agentProfile?.phone && <p><strong className="text-foreground">Phone:</strong> {agentProfile.phone}</p>}
                              <p>
                                <strong className="text-foreground">KYC:</strong>{" "}
                                {agentProfile?.kyc_verified ? <span className="text-[hsl(var(--success))]">Verified</span> : <span className="text-[hsl(var(--warning))]">Not verified</span>}
                              </p>
                              <p><strong className="text-foreground">Listed:</strong> {new Date(p.created_at).toLocaleDateString()}</p>
                              {(p.latitude != null && p.longitude != null) && (
                                <a
                                  href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-primary underline inline-flex items-center gap-1 sm:col-span-2"
                                >
                                   GPS: {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex md:flex-col gap-2 p-4 items-center justify-end shrink-0">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/property/${p.id}`)} className="gap-1 w-full">
                              <Eye className="h-4 w-4" /> View
                            </Button>
                            {isPending && (
                              <>
                                <Button size="sm" onClick={() => handleApproveProperty(p.id)} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1 w-full">
                                  <CheckCircle className="h-4 w-4" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectProperty(p.id)} className="gap-1 w-full">
                                  <XCircle className="h-4 w-4" /> Reject
                                </Button>
                              </>
                            )}
                            {!isPending && p.status !== "draft" && (
                              <Button size="sm" variant="destructive" onClick={() => handleRejectProperty(p.id)} className="gap-1 w-full">
                                <XCircle className="h-4 w-4" /> Unpublish
                              </Button>
                            )}
                            {p.status === "draft" && (
                              <Button size="sm" onClick={() => handleApproveProperty(p.id)} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1 w-full">
                                <CheckCircle className="h-4 w-4" /> Re-approve
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Documents */}
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

                                </a>
                              ))}
                            </div>
                          )}

                          {activity.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                                <Activity className="h-3 w-3" /> Activity Log
                              </p>
                              <div className="space-y-1">
                                {activity.slice(0, 5).map((l: any) => (
                                  <div key={l.id} className="text-[11px] text-muted-foreground flex justify-between gap-2">
                                    <span className="capitalize">{l.action?.replace(/_/g, " ")}</span>
                                    <span>{new Date(l.created_at).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
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
              );
            })()}

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
                          <Button size="sm" variant="destructive" onClick={() => handleDisputeStatus(d.id, "rejected")}>Reject</Button>
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
                          <td data-label="Action" className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                          <td data-label="User" className="px-4 py-3 text-muted-foreground text-xs">{log.user_id?.slice(0, 8) || "—"}</td>
                          <td data-label="Date" className="px-4 py-3 text-muted-foreground text-xs">{new Date(log.created_at).toLocaleString()}</td>
                          <td data-label="Details" className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{JSON.stringify(log.details)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditLogs.length === 0 && <p className="p-8 text-center text-muted-foreground">No audit logs</p>}
              </div>
            )}

            {tab === "reservations" && <Inspections mode="admin" embedded />}

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
                            const { data: adminProfile, error: adminProfileError } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
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
                                  <td data-label="Date" className="py-2 px-3">{new Date(e.created_at).toLocaleDateString()}</td>
                                  <td data-label="Agent" className="py-2 px-3">{p?.full_name || "Unknown"}</td>
                                  <td data-label="Type" className="py-2 px-3">
                                    <Badge variant="outline" className="text-xs">{e.type?.replace(/_/g, " ")}</Badge>
                                  </td>
                                  <td data-label="Description" className="py-2 px-3 text-muted-foreground">{e.description || "—"}</td>
                                  <td data-label="Amount" className="py-2 px-3 text-right font-bold">₦{(e.amount || 0).toLocaleString()}</td>
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
                                  <SignedBucketAsset
                                    bucket="payment-screenshots"
                                    value={req.screenshot_url}
                                    label="payment screenshot"
                                    imgClassName="w-full max-h-40 object-cover rounded border border-border"
                                  />
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
            {tab === "active-deals" && <DealsList mode="admin" embedded />}

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
                          <tr><td data-label="Date" colSpan={7} className="p-8 text-center text-muted-foreground">No withdrawal requests yet</td></tr>
                        )}
                        {withdrawals.map((w: any) => {
                          const wUser = profiles.find((p: any) => p.user_id === w.user_id);
                          return (
                            <tr key={w.id} className="border-t border-border hover:bg-muted/20">
                              <td data-label="User" className="px-4 py-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                              <td data-label="Amount" className="px-4 py-3 font-medium text-foreground">{wUser?.full_name || "Unknown"}</td>
                              <td data-label="Bank" className="px-4 py-3 font-bold text-emerald-600">₦{(w.amount || 0).toLocaleString()}</td>
                              <td data-label="Account" className="px-4 py-3 text-foreground">{w.bank_name}</td>
                              <td data-label="Status" className="px-4 py-3 text-foreground text-xs">{w.account_number}<br/><span className="text-muted-foreground">{w.account_name}</span></td>
                              <td data-label="Actions" className="px-4 py-3">
                                <Badge className={`text-xs ${
                                  w.status === "pending" ? "bg-amber-100 text-amber-700" :
                                  w.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                  "bg-red-100 text-red-700"
                                }`}>{w.status}</Badge>
                              </td>
                              <td data-label="Date" className="px-4 py-3">
                                {w.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        if (!finance.enabled) { toast.error(finance.unavailableMessage); return; }
                                        const reference = prompt("Verified provider-namespaced transfer reference:");
                                        if (!reference?.trim()) return;
                                        const { error } = await (supabase as any).rpc("approve_withdrawal", { _id: w.id, _note: reference.trim() });
                                        if (error) { toast.error(error.message); return; }
                                        toast.success("Withdrawal marked paid");
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
                                        const { error } = await (supabase as any).rpc("reject_withdrawal", { _id: w.id, _note: reason });
                                        if (error) { toast.error(error.message); return; }
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
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReferralUserId(null)}> All Users</Button>
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
                                <td data-label="User" className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
                                <td data-label="Type" className="px-4 py-3"><Badge variant="outline" className="capitalize text-xs">{p.profile_type}</Badge></td>
                                <td data-label="Referral Code" className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.referral_code || "—"}</td>
                                <td data-label="Direct Referrals" className="px-4 py-3 font-bold text-foreground">{directs}</td>
                                <td data-label="Action" className="px-4 py-3">
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
      <Dialog open={!!decision} onOpenChange={open => { if (!open && !decisionLock.current) setDecision(null); }}><DialogContent className="operations-dialog" onEscapeKeyDown={event => { if (decisionBusy) event.preventDefault(); }} onPointerDownOutside={event => { if (decisionBusy) event.preventDefault(); }}><DialogHeader><DialogTitle>{decision?.title}</DialogTitle><DialogDescription>{decision?.description}</DialogDescription></DialogHeader>{decision?.reasonRequired && <div><Label htmlFor="review-reason">Rejection reason</Label><Textarea id="review-reason" value={decisionReason} disabled={decisionBusy} onChange={event => setDecisionReason(event.target.value)} /></div>}{decisionError && <p role="alert">{decisionError}</p>}<DialogFooter><Button variant="outline" disabled={decisionBusy} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={decisionBusy || decision?.reasonRequired && !decisionReason.trim()} onClick={() => void confirmDecision()}>{decisionBusy ? "Saving review…" : "Confirm decision"}</Button></DialogFooter></DialogContent></Dialog>
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
