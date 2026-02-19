import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building, ShieldCheck, AlertTriangle, FileText, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type Tab = "users" | "properties" | "verifications" | "disputes" | "analytics";

const Admin = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, pr, v, d] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("verification_documents").select("*, profiles!verification_documents_user_id_fkey(full_name)").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles(p.data || []);
    setProperties(pr.data || []);
    setVerifications(v.data || []);
    setDisputes(d.data || []);
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

  const tabs = [
    { id: "users" as Tab, label: "Users", icon: Users, count: profiles.length },
    { id: "properties" as Tab, label: "Properties", icon: Building, count: properties.length },
    { id: "verifications" as Tab, label: "Verifications", icon: ShieldCheck, count: verifications.filter(v => v.status === "pending").length },
    { id: "disputes" as Tab, label: "Disputes", icon: AlertTriangle, count: disputes.filter(d => d.status === "open").length },
    { id: "analytics" as Tab, label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Admin Portal</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => setTab(t.id)} className="gap-2">
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && <Badge variant="secondary" className="ml-1 text-xs">{t.count}</Badge>}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {tab === "users" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trust Score</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">KYC</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{p.profile_type}</Badge></td>
                        <td className="px-4 py-3 text-foreground">{p.trust_score}/100</td>
                        <td className="px-4 py-3">
                          {p.kyc_verified ? (
                            <Badge className="bg-success/10 text-success">Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!p.kyc_verified && p.profile_type === "agent" && (
                            <Button size="sm" variant="outline" onClick={() => handleVerifyKyc(p.id)}>Verify KYC</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profiles.length === 0 && <p className="p-8 text-center text-muted-foreground">No users yet</p>}
              </div>
            )}

            {tab === "properties" && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.profiles?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-foreground">₦{(p.price || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{p.status}</Badge></td>
                        <td className="px-4 py-3">
                          {p.is_verified ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {properties.length === 0 && <p className="p-8 text-center text-muted-foreground">No properties yet</p>}
              </div>
            )}

            {tab === "verifications" && (
              <div className="space-y-4">
                {verifications.length === 0 && <p className="p-8 text-center text-muted-foreground">No verification documents</p>}
                {verifications.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{v.document_type}</p>
                      <p className="text-sm text-muted-foreground">User: {v.profiles?.full_name || v.user_id}</p>
                      <Badge variant="outline" className="mt-1">{v.status}</Badge>
                    </div>
                    {v.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleDocumentReview(v.id, "approved")} className="bg-success text-white hover:bg-success/90">Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDocumentReview(v.id, "rejected")}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "disputes" && (
              <div className="space-y-4">
                {disputes.length === 0 && <p className="p-8 text-center text-muted-foreground">No disputes</p>}
                {disputes.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-4">
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

            {tab === "analytics" && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="font-display text-3xl font-bold text-foreground">{profiles.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Verified Agents</p>
                  <p className="font-display text-3xl font-bold text-foreground">{profiles.filter(p => p.kyc_verified).length}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total Properties</p>
                  <p className="font-display text-3xl font-bold text-foreground">{properties.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Open Disputes</p>
                  <p className="font-display text-3xl font-bold text-foreground">{disputes.filter(d => d.status === "open").length}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
    </div>
  );
};

export default Admin;
