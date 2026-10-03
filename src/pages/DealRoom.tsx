import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Lock, MessageCircle, CalendarCheck, FileText, Clock } from "lucide-react";

export const DEAL_STAGES = [
  { key: "pending_agent", label: "Agent confirmation" },
  { key: "accepted", label: "Accepted" },
  { key: "inspection", label: "Inspection" },
  { key: "documents", label: "Documents" },
  { key: "payment_pending", label: "Payment" },
  { key: "payment_under_review", label: "Under review" },
  { key: "payment_confirmed", label: "Payment confirmed" },
  { key: "completed", label: "Completed" },
];

export const stageLabel = (s: string) =>
  DEAL_STAGES.find((x) => x.key === s)?.label || s.replace(/_/g, " ");

const DealRoom = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [deal, setDeal] = useState<any>(null);
  const [tx, setTx] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const db = supabase as any;
    const { data: d } = await db
      .from("deal_requests")
      .select("*, properties(id, title, price, city, state, address, image_url, status, agent_id, property_code)")
      .eq("id", id)
      .maybeSingle();
    setDeal(d);
    if (d) {
      const [t, e, ins, dc, pr] = await Promise.all([
        d.transaction_id ? db.from("transactions").select("*").eq("id", d.transaction_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from("deal_events").select("*").eq("deal_id", d.id).order("created_at", { ascending: true }),
        db.from("reservations").select("*").eq("property_id", d.property_id).order("created_at", { ascending: false }),
        db.from("property_documents").select("id, file_name, document_type, uploaded_at").eq("property_id", d.property_id),
        db.from("public_profiles").select("user_id, full_name").in("user_id", [d.buyer_id, d.agent_user_id]),
      ]);
      setTx(t.data);
      setEvents(e.data || []);
      setInspections(ins.data || []);
      setDocs(dc.data || []);
      const m: Record<string, string> = {};
      (pr.data || []).forEach((p: any) => (m[p.user_id] = p.full_name));
      setNames(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const advance = async (stage: string) => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("advance_deal_stage", { _deal_id: id, _stage: stage });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Deal updated");
    load();
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!deal) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Deal not found or you don't have access.</div>;

  const p = deal.properties || {};
  const isBuyer = user?.id === deal.buyer_id;
  const isRental = p.status === "for_rent" || p.status === "rented" || tx?.type === "rental";
  const stage = deal.stage as string;
  const idx = DEAL_STAGES.findIndex((s) => s.key === stage);
  const active = deal.status === "accepted";
  const canStep = active && ["accepted", "inspection", "documents", "payment_pending"].includes(stage);

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Deal {deal.deal_number} · Prop-Connect</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Deal #{deal.deal_number}</h1>
          <Badge variant="outline" className="capitalize">{stageLabel(stage)}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{isRental ? "Rental" : "Purchase"} · opened {new Date(deal.created_at).toLocaleDateString()}</p>

        {/* Progress */}
        <div className="mt-6 overflow-x-auto rounded-xl border bg-card p-4 shadow-card">
          <ol className="flex min-w-[640px] items-center justify-between gap-2">
            {DEAL_STAGES.map((s, i) => {
              const done = idx >= 0 && i < idx;
              const cur = i === idx;
              return (
                <li key={s.key} className="flex flex-1 flex-col items-center text-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${done ? "bg-primary text-primary-foreground border-primary" : cur ? "border-primary text-primary" : "text-muted-foreground"}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`mt-1 text-[11px] ${cur ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          {["declined", "cancelled", "disputed"].includes(stage) && (
            <p className="mt-3 text-center text-sm text-destructive capitalize">This deal is {stage}.{deal.decline_reason ? ` Reason: ${deal.decline_reason}` : ""}</p>
          )}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card title="Property">
              <div className="flex gap-3">
                <img src={p.image_url || "/placeholder.svg"} alt={p.title} className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 text-sm">
                  <Link to={`/property/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                  <p className="font-mono text-xs text-muted-foreground break-all">{deal.property_code || p.property_code}</p>
                  <p className="text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</p>
                  <p className="font-semibold">₦{Number(p.price || 0).toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card title="Buyer / Agent">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Buyer</p><p className="font-medium">{names[deal.buyer_id] || "Buyer"}</p></div>
                <div><p className="text-xs text-muted-foreground">Agent</p><p className="font-medium">{names[deal.agent_user_id] || "Agent"}</p></div>
              </div>
              {isBuyer && (
                <Link to={`/chat/new?agent=${p.agent_id}&property=${p.id}`}>
                  <Button size="sm" variant="outline" className="mt-3 gap-1"><MessageCircle className="h-4 w-4" /> Chat with agent</Button>
                </Link>
              )}
            </Card>

            <Card title="Inspection">
              {inspections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inspection booked{isBuyer ? " — book one from the property page." : "."}</p>
              ) : inspections.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <span className="flex items-center gap-1"><CalendarCheck className="h-4 w-4 text-muted-foreground" /> {r.viewing_date || "—"} {r.inspection_time || ""}</span>
                  <Badge variant="outline" className="capitalize">{r.inspection_status.replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </Card>

            <Card title="Documents">
              {docs.length === 0 ? <p className="text-sm text-muted-foreground">No documents shared yet.</p> : docs.map((d) => (
                <p key={d.id} className="flex items-center gap-2 py-1 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /> {d.file_name} <span className="text-xs text-muted-foreground">({d.document_type})</span></p>
              ))}
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Payment status">
              {tx ? (
                <div className="space-y-1 text-sm">
                  <p>Status: <span className="font-semibold capitalize">{String(tx.payment_status).replace(/_/g, " ")}</span></p>
                  <p>Amount: <span className="font-semibold">₦{Number(tx.total_payable || tx.amount).toLocaleString()}</span></p>
                </div>
              ) : <p className="text-sm text-muted-foreground">Payment unlocks after the agent accepts.</p>}
              {isBuyer && active && ["payment_pending", "accepted", "inspection", "documents"].includes(stage) && (
                <Link to={`/secure-payment/${p.id}`}>
                  <Button className="mt-3 w-full gap-1"><Lock className="h-4 w-4" /> Go to secure payment</Button>
                </Link>
              )}
            </Card>

            {canStep && (
              <Card title="Move deal forward">
                <div className="flex flex-wrap gap-2">
                  {["inspection", "documents", "payment_pending"].filter((s) => s !== stage).map((s) => (
                    <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => advance(s)}>{stageLabel(s)}</Button>
                  ))}
                  <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => advance("disputed")}>Report problem</Button>
                </div>
              </Card>
            )}

            <Card title="Activity">
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
                <ol className="space-y-2">
                  {events.map((e) => (
                    <li key={e.id} className="text-sm">
                      <p className="font-medium capitalize">{e.event.replace("stage:", "Moved to ").replace(/_/g, " ")}</p>
                      {e.details && <p className="text-xs text-muted-foreground break-words">{e.details}</p>}
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {new Date(e.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
    <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
    {children}
  </div>
);

export default DealRoom;
