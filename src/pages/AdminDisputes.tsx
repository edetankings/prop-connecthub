import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TABS = ["open", "under_review", "resolved", "refunded", "rejected"] as const;

const AdminDisputes = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>("open");
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [status, setStatus] = useState("under_review");
  const [resolution, setResolution] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("disputes")
      .select("*, properties(title, property_code)")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const submit = async () => {
    if (!active) return;
    const { error } = await (supabase as any).rpc("resolve_dispute", { _dispute_id: active.id, _status: status, _resolution: resolution });
    if (error) toast.error(error.message); else { toast.success("Dispute updated"); setActive(null); load(); }
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-display text-3xl font-bold mb-6">Disputes</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-4 space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No disputes.</div>
            ) : rows.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{d.properties?.title || "Property"}</p>
                      {d.properties?.property_code && <Badge variant="outline" className="font-mono text-xs">{d.properties.property_code}</Badge>}
                      <Badge className="text-xs capitalize">{d.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm"><span className="text-muted-foreground">Reason: </span>{d.reason}</p>
                    {d.resolution && <p className="mt-1 text-sm"><span className="text-muted-foreground">Resolution: </span>{d.resolution}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Filed {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" onClick={() => { setActive(d); setStatus(d.status === "open" ? "under_review" : d.status); setResolution(d.resolution || ""); }}>Update</Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="refunded">Refunded</option>
              <option value="rejected">Rejected</option>
            </select>
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution notes" rows={4} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
              <Button onClick={submit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};
export default AdminDisputes;
