import { Fragment, useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarCheck, Loader2 } from "lucide-react";

import AuthenticatedLayout from "@/components/AuthenticatedLayout";

type Mode = "agent" | "buyer" | "admin";

const statusStyle: Record<string, string> = {
  requested: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  reschedule_proposed: "bg-secondary/20 text-secondary-foreground",
  confirmed: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  completed: "bg-primary/10 text-primary",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-muted text-muted-foreground",
};

const Inspections = ({ mode, embedded = false }: { mode: Mode; embedded?: boolean }) => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dlg, setDlg] = useState<{ row: any; action: "propose" | "decline" } | null>(null);
  const [form, setForm] = useState({ date: "", time: "", note: "" });

  const [queryError, setQueryError] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const actionLock = useRef(false);
  const profileId = profile?.id;
  const identity = useRef(profileId); identity.current = profileId;
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    if (identity.current !== profileId) return;
    const request = ++revision.current;
    if (!profileId && mode !== "admin") { setRows([]); setLoading(false); return; }
    setLoading(true); setQueryError(false); setRows([]);
    try {
    let q = (supabase as any).from("reservations").select("*, properties(id, title, property_code, city, state, image_url)").order("created_at", { ascending: false });
    if (mode === "agent") q = q.eq("agent_id", profileId);
    if (mode === "buyer") q = q.eq("buyer_id", profileId);
    const { data, error } = await q;
    if (error) throw error;
    if (request === revision.current && identity.current === profileId) setRows(data || []);
    } catch { if (request === revision.current) setQueryError(true); } finally { if (request === revision.current) setLoading(false); }
  }, [profileId, mode]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);

  const agentAct = async (row: { id: string }, action: string, extra: { note?: string; date?: string; time?: string } = {}) => {
    if (actionLock.current) return;
    actionLock.current = true; setActionPending(true);
    try {
      const { error } = await supabase.rpc("agent_respond_inspection", { _id: row.id, _action: action, _note: extra.note || null, _date: extra.date || null, _time: extra.time || null });
      if (error) throw error;
      toast.success("Inspection updated"); setDlg(null); await load();
    } catch { toast.error("Unable to update inspection. Please try again."); }
    finally { actionLock.current = false; setActionPending(false); }
  };
  const buyerAct = async (row: { id: string }, action: string) => {
    if (actionLock.current) return;
    actionLock.current = true; setActionPending(true);
    try {
      const { error } = await supabase.rpc("buyer_respond_inspection", { _id: row.id, _action: action });
      if (error) throw error;
      toast.success("Inspection updated"); await load();
    } catch { toast.error("Unable to update inspection. Please try again."); }
    finally { actionLock.current = false; setActionPending(false); }
  };

  const shown = rows.filter((r) => filter === "all" || r.inspection_status === filter);
  const title = mode === "admin" ? "All inspections" : mode === "agent" ? "Inspection requests" : "My inspections";

  const Layout = !embedded && mode !== "admin" ? AuthenticatedLayout : Fragment;
  const Heading = embedded ? "h2" : "h1";
  return (
    <Layout><div className="inspection-page min-h-screen bg-background">
      <Helmet><title>{title} · Prop-Connect</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarCheck className="h-5 w-5" /></div>
          <div>
            <Heading className="font-display text-2xl font-semibold sm:text-3xl">{title}</Heading>
            <p className="text-sm text-muted-foreground">
              {mode === "admin" ? "Overview only — agents handle inspections directly." : mode === "agent" ? "Confirm, propose a new time, or decline." : "Review requested times, agent responses and inspection history."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["all", "requested", "reschedule_proposed", "confirmed", "completed", "declined", "cancelled", "no_show"].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} aria-pressed={filter === f} onClick={() => setFilter(f)} className="capitalize">{f.replace(/_/g, " ")}</Button>
          ))}
        </div>

        {queryError ? <div role="alert" className="buyer-empty"><h2>Unable to load inspections.</h2><p>Your inspection records could not be retrieved.</p><Button variant="outline" onClick={() => void load()}>Retry inspections</Button></div> : loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="mt-4 space-y-3">
            {shown.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No inspections match this view. {mode === "buyer" && <Link to="/properties">Explore properties</Link>}</div>}
            {shown.map((r) => (
              <div key={r.id} className="inspection-record rounded-xl border bg-card p-4 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/property/${r.property_id}`} className="font-semibold hover:underline">{r.properties?.title || "Property"}</Link>
                      <Badge className={`capitalize ${statusStyle[r.inspection_status] || ""}`}>{(r.inspection_status || "Status not recorded").replace(/_/g, " ")}</Badge>
                    </div>
                    {r.properties?.property_code && <p className="font-mono text-xs text-muted-foreground break-all">{r.properties.property_code}</p>}
                    <p className="mt-1 text-muted-foreground">Requested: {r.viewing_date || "—"} {r.inspection_time || ""}</p>
                    {r.inspection_status === "reschedule_proposed" && <p className="text-foreground">Proposed: {r.proposed_date} {r.proposed_time || ""}</p>}
                    {mode === "buyer" && <Link to={`/chat/new?agent=${r.agent_id}&property=${r.property_id}`} className="inspection-agent-link">Message the listing agent</Link>}
                    {mode !== "buyer" && r.buyer_name && <p className="text-muted-foreground">Buyer: {r.buyer_name}</p>}
                    {r.message && <p className="mt-1 text-xs italic text-muted-foreground break-words">"{r.message}"</p>}
                    {r.agent_note && <p className="mt-1 text-xs text-muted-foreground break-words">Agent note: {r.agent_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {mode === "agent" && r.inspection_status === "requested" && (<>
                      <Button size="sm" disabled={actionPending} onClick={() => agentAct(r, "confirm")}>Confirm</Button>
                      <Button size="sm" disabled={actionPending} variant="outline" onClick={() => { setForm({ date: "", time: "", note: "" }); setDlg({ row: r, action: "propose" }); }}>Propose new time</Button>
                      <Button size="sm" disabled={actionPending} variant="outline" className="text-destructive" onClick={() => { setForm({ date: "", time: "", note: "" }); setDlg({ row: r, action: "decline" }); }}>Decline</Button>
                    </>)}
                    {mode === "agent" && r.inspection_status === "confirmed" && (<>
                      <Button size="sm" disabled={actionPending} variant="outline" onClick={() => agentAct(r, "completed")}>Mark completed</Button>
                      <Button size="sm" disabled={actionPending} variant="outline" onClick={() => agentAct(r, "no_show")}>No-show</Button>
                    </>)}
                    {mode === "buyer" && r.inspection_status === "reschedule_proposed" && (
                      <Button size="sm" disabled={actionPending} onClick={() => buyerAct(r, "accept")}>Accept new time</Button>
                    )}
                    {mode === "buyer" && ["requested", "reschedule_proposed", "confirmed"].includes(r.inspection_status) && (
                      <Button size="sm" disabled={actionPending} variant="outline" onClick={() => buyerAct(r, "cancel")}>Cancel</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="inspection-response-dialog">
          <DialogHeader><DialogTitle>{dlg?.action === "propose" ? "Propose a new time" : "Decline inspection"}</DialogTitle><DialogDescription>Respond to the recorded request. A proposed time requires buyer acceptance; it is not automatic confirmation.</DialogDescription></DialogHeader>
          {dlg?.action === "propose" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="inspection-date">Date</Label><Input id="inspection-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label htmlFor="inspection-time">Time</Label><Input id="inspection-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </div>
          )}
          <div><Label htmlFor="inspection-note">Note {dlg?.action === "decline" ? "(reason)" : "(optional)"}</Label><Textarea id="inspection-note" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button>
            <Button disabled={actionPending} onClick={() => {
              if (!dlg) return;
              if (dlg.action === "propose" && !form.date) return toast.error("Pick a date");
              agentAct(dlg.row, dlg.action, form);
            }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div></Layout>
  );
};

export default Inspections;
