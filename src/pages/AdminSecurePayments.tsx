import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, RotateCcw, FileText, RefreshCw, Clock } from "lucide-react";
import TransactionTrace from "@/components/TransactionTrace";

const STATUSES = ["under_review", "pending_payment", "secured", "released", "refunded", "expired", "rejected"] as const;
type Status = typeof STATUSES[number];

const statusColor: Record<string, string> = {
  pending_payment: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  under_review: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
  secured: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  released: "bg-primary/15 text-primary",
  refunded: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const AdminSecurePayments = () => {
  const [tab, setTab] = useState<Status>("under_review");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionTx, setActionTx] = useState<{ tx: any; type: "reject" | "refund" } | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("transactions")
      .select("*, properties(title, city, state, image_url, property_code), buyer:buyer_id(email), seller:seller_id(email)")
      .eq("payment_status", tab)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const approve = async (id: string) => {
    const { error } = await (supabase as any).rpc("approve_secure_payment", { _transaction_id: id });
    if (error) toast.error(error.message); else { toast.success("Approved & secured"); load(); }
  };
  const release = async (id: string) => {
    if (!confirm("Release funds to the agent? This cannot be undone.")) return;
    const { error } = await (supabase as any).rpc("release_secure_payment", { _transaction_id: id });
    if (error) toast.error(error.message); else { toast.success("Funds released"); load(); }
  };
  const submitReason = async () => {
    if (!actionTx) return;
    if (!reason.trim()) { toast.error("Reason required"); return; }
    const fn = actionTx.type === "reject" ? "reject_secure_payment" : "refund_secure_payment";
    const { error } = await (supabase as any).rpc(fn, { _transaction_id: actionTx.tx.id, _reason: reason });
    if (error) toast.error(error.message);
    else { toast.success(actionTx.type === "reject" ? "Rejected" : "Refunded"); setActionTx(null); setReason(""); load(); }
  };

  const viewReceipt = async (path: string) => {
    if (!path) return;
    const { data } = await (supabase as any).storage.from("payment-screenshots").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not load receipt");
  };

  const runExpiry = async () => {
    const { data, error } = await (supabase as any).rpc("expire_stale_transactions");
    if (error) toast.error(error.message); else toast.success(`Expired ${data ?? 0} stale transactions`);
    load();
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Secure Payments</h1>
            <p className="text-muted-foreground text-sm">Review buyer payment proofs, secure funds, release to agents.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runExpiry} className="gap-2"><Clock className="h-4 w-4" /> Run Expiry Sweep</Button>
            <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="flex-wrap h-auto">
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No transactions in this state.</div>
            ) : (
              <div className="space-y-3">
                {rows.map((tx) => (
                  <div key={tx.id} className="rounded-xl border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[240px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{tx.properties?.title || "Property"}</p>
                          <Badge className={`text-xs ${statusColor[tx.payment_status] || ""}`}>{tx.payment_status?.replace(/_/g, " ").toUpperCase()}</Badge>
                          {tx.property_code && <Badge variant="outline" className="text-xs font-mono">{tx.property_code}</Badge>}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 mt-2 text-sm">
                          <p className="text-muted-foreground">Amount: <span className="text-foreground font-semibold">₦{tx.total_payable?.toLocaleString()}</span></p>
                          <p className="text-muted-foreground">Commission: <span className="text-foreground">₦{tx.commission_amount?.toLocaleString() ?? 0}</span></p>
                          <p className="text-muted-foreground">Type: <span className="text-foreground capitalize">{tx.type}</span></p>
                          <p className="text-muted-foreground">Created: <span className="text-foreground">{new Date(tx.created_at).toLocaleString()}</span></p>
                          <p className="text-muted-foreground">Buyer: <span className="text-foreground">{tx.buyer?.email || tx.buyer_id?.slice(0, 8)}</span></p>
                          <p className="text-muted-foreground">Agent: <span className="text-foreground">{tx.seller?.email || tx.seller_id?.slice(0, 8)}</span></p>
                          {tx.expires_at && <p className="text-muted-foreground">Expires: <span className="text-foreground">{new Date(tx.expires_at).toLocaleString()}</span></p>}
                          {tx.released_at && <p className="text-muted-foreground">Released: <span className="text-foreground">{new Date(tx.released_at).toLocaleString()}</span></p>}
                        </div>
                        {tx.rejection_reason && <p className="mt-2 text-sm text-destructive">Reason: {tx.rejection_reason}</p>}
                        <div className="mt-3">
                          <TransactionTrace
                            transactionId={tx.id}
                            propertyId={tx.property_id}
                            propertyCode={tx.property_code || tx.properties?.property_code}
                            buyerId={tx.buyer_id}
                            agentId={tx.seller_id}
                            buyerName={tx.buyer?.email}
                            agentName={tx.seller?.email}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {tx.property_id && <Link to={`/property/${tx.property_id}`} className="text-xs text-secondary hover:underline">View property →</Link>}
                        {tx.proof_url && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => viewReceipt(tx.proof_url)}>
                            <FileText className="h-3.5 w-3.5" /> View Receipt
                          </Button>
                        )}
                        {tx.payment_status === "under_review" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approve(tx.id)} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 gap-1">
                              <CheckCircle className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { setActionTx({ tx, type: "reject" }); setReason(""); }} className="gap-1">
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        )}
                        {tx.payment_status === "secured" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => release(tx.id)} className="gap-1">
                              <CheckCircle className="h-4 w-4" /> Release Funds
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setActionTx({ tx, type: "refund" }); setReason(""); }} className="gap-1">
                              <RotateCcw className="h-4 w-4" /> Refund
                            </Button>
                          </div>
                        )}
                        {tx.payment_status === "released" && (
                          <Button size="sm" variant="outline" onClick={() => { setActionTx({ tx, type: "refund" }); setReason(""); }} className="gap-1">
                            <RotateCcw className="h-4 w-4" /> Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!actionTx} onOpenChange={(o) => !o && setActionTx(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionTx?.type === "reject" ? "Reject Payment" : "Refund Transaction"}</DialogTitle>
            </DialogHeader>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / note (visible to buyer & agent)" rows={4} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setActionTx(null)}>Cancel</Button>
              <Button onClick={submitReason} variant={actionTx?.type === "reject" ? "destructive" : "default"}>
                Confirm {actionTx?.type === "reject" ? "Reject" : "Refund"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminSecurePayments;
