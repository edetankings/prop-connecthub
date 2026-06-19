import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";

const colors: Record<string, string> = {
  pending_payment: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  under_review: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
  secured: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  released: "bg-primary/15 text-primary",
  refunded: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

const SecureTransactions = ({ role }: { role: "buyer" | "agent" }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [dispute, setDispute] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    if (!user?.id) return;
    const filter = role === "buyer" ? { buyer_id: user.id } : { seller_id: user.id };
    const { data } = await (supabase as any)
      .from("transactions")
      .select("*, properties(title, image_url, property_code, city, state)")
      .match(filter)
      .order("created_at", { ascending: false });
    setRows(data || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const release = async (id: string) => {
    if (!confirm("Confirm you have received the property/keys? This will release funds to the agent.")) return;
    const { error } = await (supabase as any).rpc("release_secure_payment", { _transaction_id: id });
    if (error) toast.error(error.message); else { toast.success("Funds released ✅"); load(); }
  };

  const submitDispute = async () => {
    if (!dispute || !reason.trim()) { toast.error("Reason required"); return; }
    const { error } = await (supabase as any).rpc("raise_dispute", { _transaction_id: dispute.id, _reason: reason });
    if (error) toast.error(error.message); else { toast.success("Dispute submitted"); setDispute(null); setReason(""); }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-card">
        No secure transactions yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((tx) => (
          <div key={tx.id} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={tx.property_id ? `/property/${tx.property_id}` : "#"} className="font-semibold hover:underline">{tx.properties?.title || "Property"}</Link>
                  <Badge className={`text-xs ${colors[tx.payment_status] || ""}`}>{tx.payment_status?.replace(/_/g, " ").toUpperCase()}</Badge>
                  {tx.property_code && <Badge variant="outline" className="font-mono text-xs">{tx.property_code}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-6 mt-2 text-sm">
                  <p className="text-muted-foreground">Amount: <span className="text-foreground font-semibold">₦{tx.total_payable?.toLocaleString()}</span></p>
                  <p className="text-muted-foreground">Created: <span className="text-foreground">{new Date(tx.created_at).toLocaleDateString()}</span></p>
                </div>
                {tx.rejection_reason && <p className="mt-1 text-xs text-destructive">Note: {tx.rejection_reason}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {role === "buyer" && tx.payment_status === "pending_payment" && tx.property_id && (
                  <Link to={`/secure-payment/${tx.property_id}`}><Button size="sm" className="gap-1"><ShieldCheck className="h-4 w-4" /> Upload Proof</Button></Link>
                )}
                {role === "buyer" && tx.payment_status === "secured" && (
                  <>
                    <Button size="sm" onClick={() => release(tx.id)} className="gap-1 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90">
                      <CheckCircle className="h-4 w-4" /> Release Payment
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => { setDispute(tx); setReason(""); }}>
                      <AlertTriangle className="h-4 w-4" /> Raise Dispute
                    </Button>
                  </>
                )}
                {tx.payment_status === "released" && (role === "buyer" || role === "agent") && (
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => { setDispute(tx); setReason(""); }}>
                    <AlertTriangle className="h-4 w-4" /> Raise Dispute
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dispute} onOpenChange={(o) => !o && setDispute(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise a Dispute</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Our team will review and contact both parties within 24 hours.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe what went wrong…" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDispute(null)}>Cancel</Button>
            <Button onClick={submitDispute}>Submit Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecureTransactions;
