import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function OperationsOverview() {
  const { isAdmin } = useAuth();
  const [counts, setCounts] = useState<number[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    if (!isAdmin) { setCounts(null); setLoading(false); return; }
    setLoading(true); setError(false); setCounts(null);
    try {
      const results = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_type", "buyer"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_type", "agent"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("profile_type", "builder"),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "under_verification"),
        supabase.from("kyc_verifications").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("inspection_status", "requested"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("payment_status", "under_review"),
      ]);
      if (results.some(result => result.error || result.count == null)) throw new Error("Counts unavailable");
      if (revision.current === request) setCounts(results.map(result => result.count!));
    } catch { if (revision.current === request) setError(true); }
    finally { if (revision.current === request) setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  if (!isAdmin) return null;
  const labels = ["Registered profiles", "Buyers", "Agents", "Builders / developers", "Property listings", "Awaiting property review", "Pending KYC submissions", "Requested inspections", "Payment records under review"];
  const links = ["/admin?view=users", "/admin?view=users", "/admin?view=users", "/admin?view=users", "/admin?view=moderation", "/admin?view=moderation", "/admin?view=verification", "/admin/inspections", "/admin/deals"];
  return <section className="operations-overview" aria-label="Authorized platform summary">
    <div className="operations-section-heading"><div><p className="buyer-eyebrow">Platform operations</p><h2>Clarity for every review.</h2><p>Authorized database counts. Profile categories are separate from administrator privileges.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()}>Refresh summary</Button></div>
    {error ? <div role="alert" className="buyer-empty"><h3>Summary unavailable</h3><p>No counts are shown because a request failed.</p><Button onClick={() => void load()} variant="outline">Retry summary</Button></div> : <div className="operations-metrics" aria-busy={loading}>{labels.map((label, index) => <Link key={label} to={links[index]} className="operations-metric"><span>{label}</span><strong>{counts ? counts[index].toLocaleString() : "—"}</strong><span>{loading ? "Loading count…" : "View records →"}</span></Link>)}</div>}
    <div className="operations-notice"><h3>Financial operations remain locked</h3><p>Stored payment statuses are records, not proof of settlement. This workspace does not enable payments, transfers, escrow release or transaction completion.</p></div>
  </section>;
}
