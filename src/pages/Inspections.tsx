import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarCheck, Loader2 } from "lucide-react";

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

const Inspections = ({ mode }: { mode: Mode }) => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dlg, setDlg] = useState<{ row: any; action: "propose" | "decline" } | null>(null);
  const [form, setForm] = useState({ date: "", time: "", note: "" });

  const load = async () => {
    if (!profile?.id && mode !== "admin") return;
    setLoading(true);
    let q = (supabase as any).from("reservations").select("*, properties(id, title, property_code, city, state)").order("created_at", { ascending: false });
    if (mode === "agent") q = q.eq("agent_id", profile!.id);
    if (mode === "buyer") q = q.eq("buyer_id", profile!.id);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id, mode]);

  const agentAct = async (row: any, action: string, extra: any = {}) => {
    const { error } = await (supabase as any).rpc("agent_respond_inspection", { _id: row.id, _action: action, _note: extra.note || null, _date: extra.date || null, _time: extra.time || null });
    if (error) return toast.error(error.message);
    toast.success("Inspection updated");
    setDlg(null); load();
  };
  const buyerAct = async (row: any, action: string) => {
    const { error } = await (supabase as any).rpc("buyer_respond_inspection", { _id: row.id, _action: action });
    if (error) return toast.error(error.message);
    toast.success("Inspection updated"); load();
  };

  const shown = rows.filter((r) => filter === "all" || r.inspection_status === filter);
  const title = mode === "admin" ? "All inspections" : mode === "agent" ? "Inspection requests" : "My inspections";

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{title} · Prop-Connect</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarCheck className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "admin" ? "Overview only — agents handle inspections directly." : mode === "agent" ? "Confirm, propose a new time, or decline." : "Track the inspections you've booked."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["all", "requested", "reschedule_proposed", "confirmed", "completed", "declined", "cancelled"].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f.replace(/_/g, " ")}</Button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="mt-4 space-y-3">
            {shown.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No inspections.</div>}
            {shown.map((r) => (
              <div key={r.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/property/${r.property_id}`} className="font-semibold hover:underline">{r.properties?.title || "Property"}</Link>
                      <Badge className={`capitalize ${statusStyle[r.inspection_status] || ""}`}>{r.inspection_status.replace(/_/g, " ")}</Badge>
                    </div>
                    {r.properties?.property_code && <p className="font-mono text-xs text-muted-foreground break-all">{r.properties.property_code}</p>}
                    <p className="mt-1 text-muted-foreground">Requested: {r.viewing_date || "—"} {r.inspection_time || ""}</p>
                    {r.inspection_status === "reschedule_proposed" && <p className="text-foreground">Proposed: {r.proposed_date} {r.proposed_time || ""}</p>}
                    {mode !== "buyer" && r.buyer_name && <p className="text-muted-foreground">Buyer: {r.buyer_name}</p>}
                    {r.message && <p className="mt-1 text-xs italic text-muted-foreground break-words">"{r.message}"</p>}
                    {r.agent_note && <p className="mt-1 text-xs text-muted-foreground break-words">Agent note: {r.agent_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {mode === "agent" && r.inspection_status === "requested" && (<>
                      <Button size="sm" onClick={() => agentAct(r, "confirm")}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => { setForm({ date: "", time: "", note: "" }); setDlg({ row: r, action: "propose" }); }}>Propose new time</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setForm({ date: "", time: "", note: "" }); setDlg({ row: r, action: "decline" }); }}>Decline</Button>
                    </>)}
                    {mode === "agent" && r.inspection_status === "confirmed" && (<>
                      <Button size="sm" variant="outline" onClick={() => agentAct(r, "completed")}>Mark completed</Button>
                      <Button size="sm" variant="outline" onClick={() => agentAct(r, "no_show")}>No-show</Button>
                    </>)}
                    {mode === "buyer" && r.inspection_status === "reschedule_proposed" && (
                      <Button size="sm" onClick={() => buyerAct(r, "accept")}>Accept new time</Button>
                    )}
                    {mode === "buyer" && ["requested", "reschedule_proposed", "confirmed"].includes(r.inspection_status) && (
                      <Button size="sm" variant="outline" onClick={() => buyerAct(r, "cancel")}>Cancel</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg?.action === "propose" ? "Propose a new time" : "Decline inspection"}</DialogTitle></DialogHeader>
          {dlg?.action === "propose" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </div>
          )}
          <div><Label>Note {dlg?.action === "decline" ? "(reason)" : "(optional)"}</Label><Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!dlg) return;
              if (dlg.action === "propose" && !form.date) return toast.error("Pick a date");
              agentAct(dlg.row, dlg.action, form);
            }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inspections;
