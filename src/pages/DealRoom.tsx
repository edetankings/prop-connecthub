import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import type { Tables } from "@/integrations/supabase/types";
export const DEAL_STAGES = [
  { key: "pending_agent", label: "Agent confirmation" }, { key: "accepted", label: "Accepted" },
  { key: "inspection", label: "Inspection" }, { key: "documents", label: "Documents" },
  { key: "payment_pending", label: "Payment pending" }, { key: "payment_under_review", label: "Payment under review" },
  { key: "payment_confirmed", label: "Payment confirmed" }, { key: "completed", label: "Completed" },
];
export const stageLabel = (stage: string) => DEAL_STAGES.find(item => item.key === stage)?.label || stage.replace(/_/g, " ");
type Deal = Tables<"deal_requests"> & { properties: Pick<Tables<"properties">, "id" | "title" | "price" | "city" | "state" | "image_url" | "property_code"> | null };
type Snapshot = { deal: Deal; transaction: Tables<"transactions"> | null; events: Tables<"deal_events">[]; inspections: Tables<"reservations">[]; documents: Pick<Tables<"property_documents">, "id" | "file_name" | "document_type" | "uploaded_at">[]; names: { full_name: string; user_id: string }[] };
export default function DealRoom() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    setLoading(true); setError(false); setSnapshot(null);
    if (!id) { setLoading(false); return; }
    try {
      const result = await supabase.from("deal_requests").select("*, properties(id, title, price, city, state, image_url, property_code)").eq("id", id).maybeSingle();
      if (result.error) throw result.error;
      const deal = result.data;
      if (!deal) return;
      const [transaction, events, inspections, documents, participants] = await Promise.all([
        deal.transaction_id ? supabase.from("transactions").select("*").eq("id", deal.transaction_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from("deal_events").select("*").eq("deal_id", deal.id).order("created_at", { ascending: true }),
        supabase.from("reservations").select("*").eq("property_id", deal.property_id).order("created_at", { ascending: false }),
        supabase.from("property_documents").select("id, file_name, document_type, uploaded_at").eq("property_id", deal.property_id),
        supabase.rpc("get_deal_participants", { _deal_id: deal.id }),
      ]);
      if ([transaction, events, inspections, documents, participants].some(item => item.error)) throw new Error("Details unavailable");
      if (revision.current === request) setSnapshot({ deal, transaction: transaction.data, events: events.data || [], inspections: inspections.data || [], documents: documents.data || [], names: participants.data || [] });
    } catch { if (revision.current === request) setError(true); }
    finally { if (revision.current === request) setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  return <AuthenticatedLayout><section className="operations-page deal-records"><header className="operations-heading"><p className="buyer-eyebrow">Read-only deal tracking</p><h1>{snapshot ? `Deal #${snapshot.deal.deal_number}` : "Deal record"}</h1><p>Recorded events and authorized documents. No payment, settlement or stage-change actions are available.</p></header>
    {error ? <div role="alert" className="buyer-empty"><h2>Unable to load complete deal details</h2><Button variant="outline" onClick={() => void load()}>Retry deal details</Button></div> : loading ? <p role="status" className="operations-loading">Loading authorized details…</p> : !snapshot ? <div className="buyer-empty"><h2>Deal unavailable</h2><p>This record was not found or is outside your access.</p></div> : <>
      <div className="operations-notice"><Badge variant="outline">{stageLabel(snapshot.deal.stage)}</Badge><p>Opened {new Date(snapshot.deal.created_at).toLocaleString()}. Financial operations remain locked.</p></div>
      <div className="operations-record-grid"><article className="operations-record"><h2>Property & participants</h2>{snapshot.deal.properties ? <><img className="deal-property-photo" src={snapshot.deal.properties.image_url || "/placeholder.svg"} alt="" /><Link to={`/property/${snapshot.deal.property_id}`}>{snapshot.deal.properties.title}</Link><p>{[snapshot.deal.properties.city, snapshot.deal.properties.state].filter(Boolean).join(", ")}</p><p>Listing price: ₦{Number(snapshot.deal.properties.price).toLocaleString()}</p></> : <p>Property details unavailable.</p>}<p>Buyer: {snapshot.names.find(person => person.user_id === snapshot.deal.buyer_id)?.full_name || "Name unavailable"}</p><p>Professional: {snapshot.names.find(person => person.user_id === snapshot.deal.agent_user_id)?.full_name || "Name unavailable"}</p></article>
      <article className="operations-record"><h2>Stored transaction status</h2>{snapshot.transaction ? <><Badge variant="outline">{snapshot.transaction.payment_status?.replace(/_/g, " ") || "Not recorded"}</Badge><p>Recorded amount: ₦{Number(snapshot.transaction.total_payable ?? snapshot.transaction.amount).toLocaleString()}</p><p>Created {new Date(snapshot.transaction.created_at).toLocaleString()}</p></> : <p>No linked transaction record.</p>}<p className="operations-caption">A stored status does not independently verify a transfer or settlement.</p></article>
      <article className="operations-record"><h2>Inspection records</h2>{snapshot.inspections.length ? snapshot.inspections.map(row => <div key={row.id} className="operations-timeline-entry"><p>Requested {row.viewing_date || "Date not recorded"} {row.inspection_time || ""}</p><Badge variant="outline">{row.inspection_status.replace(/_/g, " ")}</Badge>{row.proposed_date && <p>Proposed {row.proposed_date} {row.proposed_time || ""}</p>}</div>) : <p>No authorized inspection records.</p>}</article>
      <article className="operations-record"><h2>Document references</h2>{snapshot.documents.length ? snapshot.documents.map(document => <div key={document.id} className="operations-timeline-entry"><h3>{document.file_name}</h3><p>{document.document_type} · {new Date(document.uploaded_at).toLocaleDateString()}</p></div>) : <p>No authorized document references.</p>}<p className="operations-caption">Metadata only. Private object paths and public download links are not exposed.</p></article></div>
      <article className="operations-record operations-activity"><h2>Recorded activity</h2>{snapshot.events.length ? <ol>{snapshot.events.map(event => <li key={event.id} className="operations-timeline-entry"><h3>{event.event.replace("stage:", "Stage: ").replace(/_/g, " ")}</h3>{event.details && <p>{event.details}</p>}<time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></li>)}</ol> : <p>No recorded activity. Milestone dates are not inferred from the current stage.</p>}</article>
    </>}
  </section></AuthenticatedLayout>;
}
