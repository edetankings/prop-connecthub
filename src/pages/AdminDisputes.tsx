import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TABS = ["open", "under_review", "resolved", "refunded", "rejected"] as const;

const AdminDisputes = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]>("open");
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [status, setStatus] = useState("under_review");
  const [resolution, setResolution] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true); setLoadError(false); setRows([]);
    try {
    const { data, error } = await (supabase as any)
      .from("disputes")
      .select("*, properties(title, property_code)")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (request === revision.current) setRows(data || []);
    } catch { if (request === revision.current) setLoadError(true); }
    finally { if (request === revision.current) setLoading(false); }
  }, [tab]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);

  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const submit = async () => {
    if (!active || actionLock.current || !resolution.trim()) return;
    actionLock.current = true; setBusy(true);
    try {
    const { error } = await (supabase as any).rpc("resolve_dispute", { _dispute_id: active.id, _status: status, _resolution: resolution });
    if (error) throw error;
    toast.success("Non-financial review saved"); setActive(null); load();
    } catch { toast.error("Unable to save dispute review. Please retry."); }
    finally { actionLock.current = false; setBusy(false); }
  };

  return (
    <AuthenticatedLayout>
      <div className="operations-page">
        <h1 className="font-display text-3xl font-bold mb-6">Disputes</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-4 space-y-3">
            {loadError ? <div role="alert" className="buyer-empty"><h2>Dispute records unavailable</h2><Button variant="outline" onClick={() => void load()}>Retry disputes</Button></div> : loading ? <p role="status" className="operations-loading">Loading dispute records…</p> : rows.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No disputes.</div>
            ) : rows.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{d.properties?.title || "Property"}</p>
                      {d.properties?.property_code && <Badge variant="outline" className="font-mono text-xs">{d.properties.property_code}</Badge>}
                      <Badge className="text-xs capitalize">{d.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm"><span className="text-muted-foreground">Reason: </span>{d.reason}</p>
                    {d.resolution && <p className="mt-1 text-sm"><span className="text-muted-foreground">Resolution: </span>{d.resolution}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Filed {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <Button size="sm" onClick={() => { setActive(d); setStatus(["under_review", "resolved", "rejected"].includes(d.status) ? d.status : "under_review"); setResolution(d.resolution || ""); }}>Update</Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!active} onOpenChange={(o) => !o && !busy && setActive(null)}>
          <DialogContent className="operations-dialog">
            <DialogHeader><DialogTitle>Record dispute review</DialogTitle><DialogDescription>Non-financial review only. Refunds, settlement and transfers remain locked.</DialogDescription></DialogHeader>
            <select aria-label="Non-financial resolution status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">

              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>

              <option value="rejected">Rejected</option>
            </select>
            <Textarea aria-label="Resolution notes" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Resolution notes" rows={4} />
            <DialogFooter>
              <Button variant="ghost" disabled={busy} onClick={() => setActive(null)}>Cancel</Button>
              <Button disabled={busy || !resolution.trim()} onClick={submit}>{busy ? "Saving…" : "Save review"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
};
export default AdminDisputes;
