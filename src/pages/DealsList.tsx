import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { stageLabel } from "./DealRoom";
import type { Tables } from "@/integrations/supabase/types";
type Deal = Tables<"deal_requests"> & { properties: Pick<Tables<"properties">, "title" | "price" | "city" | "state"> | null };
export default function DealsList({ mode, embedded = false }: { mode: "buyer" | "admin"; embedded?: boolean }) {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    setRows([]); setLoading(true); setError(false);
    if (!user || mode === "admin" && !isAdmin) { setLoading(false); return; }
    try {
      let query = supabase.from("deal_requests").select("*, properties(title, price, city, state)").order("created_at", { ascending: false });
      if (mode === "buyer") query = query.eq("buyer_id", user.id);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      if (revision.current === request) setRows(data || []);
    } catch { if (revision.current === request) setError(true); }
    finally { if (revision.current === request) setLoading(false); }
  }, [user, mode, isAdmin]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  const shown = rows.filter(row => filter === "all" || row.stage === filter);
  const stages = Array.from(new Set(rows.map(row => row.stage)));
  const Layout = embedded ? Fragment : AuthenticatedLayout;
  const Heading = embedded ? "h2" : "h1";
  if (mode === "admin" && !isAdmin) return null;
  return <Layout><section className="operations-page deal-records"><header className="operations-heading"><p className="buyer-eyebrow">Recorded activity</p><Heading>{mode === "admin" ? "Platform deal records" : "My deal records"}</Heading><p>Read-only tracking. Financial operations and transaction completion remain locked.</p></header>
    <div className="operations-section-heading"><label className="operations-select-label">Recorded stage<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All stages</option>{stages.map(stage => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select></label><Button variant="outline" disabled={loading} onClick={() => void load()}>Refresh deals</Button></div>
    {error ? <div className="buyer-empty" role="alert"><h2>Unable to load deal records</h2><Button variant="outline" onClick={() => void load()}>Retry deals</Button></div> : loading ? <div role="status" className="operations-loading">Loading authorized deal records…</div> : <div className="operations-record-grid">{shown.length === 0 && <div className="buyer-empty"><h3>No matching deal records</h3><p>No deal data is invented when records are unavailable.</p></div>}{shown.map(deal => <Link key={deal.id} to={`/deal/${deal.id}`} className="operations-record"><div className="operations-section-heading"><span className="buyer-eyebrow">Deal #{deal.deal_number}</span><Badge variant="outline">{stageLabel(deal.stage)}</Badge></div><h3>{deal.properties?.title || "Property details unavailable"}</h3><p>{[deal.properties?.city, deal.properties?.state].filter(Boolean).join(", ") || "Location not recorded"}</p><p>{deal.properties?.price != null ? `Listing price: ₦${Number(deal.properties.price).toLocaleString()}` : "Listing price not available"}</p><small>Opened {new Date(deal.created_at).toLocaleDateString()}</small><span>View recorded activity </span></Link>)}</div>}
  </section></Layout>;
}
