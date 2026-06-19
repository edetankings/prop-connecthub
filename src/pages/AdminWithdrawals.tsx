import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TABS = ["pending", "approved", "paid", "rejected"] as const;

const AdminWithdrawals = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState<{ w: any; type: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("withdrawals")
      .select("*, profiles:user_id(full_name)")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const submit = async () => {
    if (!action) return;
    const fn = action.type === "approve" ? "approve_withdrawal" : "reject_withdrawal";
    const { error } = await (supabase as any).rpc(fn, { _id: action.w.id, _note: note });
    if (error) toast.error(error.message); else { toast.success("Done"); setAction(null); setNote(""); load(); }
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-display text-3xl font-bold mb-6">Withdrawals</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>{TABS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}</TabsList>
          <TabsContent value={tab} className="mt-4 space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No withdrawals.</div>
            ) : rows.map((w) => (
              <div key={w.id} className="rounded-xl border bg-card p-4 shadow-card flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <p className="font-semibold">₦{w.amount?.toLocaleString()} <Badge className="ml-2 capitalize text-xs">{w.status}</Badge></p>
                  <p className="text-sm text-muted-foreground">Agent: {w.profiles?.full_name || w.user_id?.slice(0, 8)}</p>
                  <p className="text-sm">{w.bank_name} • {w.account_number} • {w.account_name}</p>
                  {w.admin_note && <p className="text-sm text-muted-foreground mt-1">Note: {w.admin_note}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Requested {new Date(w.created_at).toLocaleString()}</p>
                </div>
                {w.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setAction({ w, type: "approve" }); setNote(""); }} className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90">Mark Paid</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setAction({ w, type: "reject" }); setNote(""); }}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{action?.type === "approve" ? "Mark Paid" : "Reject Withdrawal"}</DialogTitle></DialogHeader>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. payment reference)" rows={3} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
              <Button onClick={submit} variant={action?.type === "reject" ? "destructive" : "default"}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};
export default AdminWithdrawals;
