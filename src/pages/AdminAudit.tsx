import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
export default function AdminAudit() {
  const [rows, setRows] = useState<Tables<"audit_logs">[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    setRows([]); setLoading(true); setError(false);
    try {
      const result = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (result.error) throw result.error;
      if (request === revision.current) setRows(result.data || []);
    } catch { if (request === revision.current) setError(true); }
    finally { if (request === revision.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);
  const filtered = rows.filter(row => !query.trim() || `${row.action} ${JSON.stringify(row.details || {})}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <AuthenticatedLayout><section className="operations-page"><header className="operations-heading"><p className="buyer-eyebrow">Administration / Accountability</p><h1>Audit log</h1><p>Read-only search within the latest 500 authorized entries returned by the service.</p></header><div className="operations-section-heading"><label className="operations-select-label">Search audit entries<Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Action or recorded details" /></label><Button variant="outline" disabled={loading} onClick={() => void load()}>Refresh log</Button></div>
    {error ? <div className="buyer-empty" role="alert"><h2>Audit log unavailable</h2><Button variant="outline" onClick={() => void load()}>Retry audit log</Button></div> : loading ? <p role="status" className="operations-loading">Loading audit entries…</p> : <div className="operations-table-wrap"><table className="operations-user-table"><caption className="sr-only">Authorized audit entries</caption><thead><tr><th>When</th><th>Action</th><th>Actor reference</th><th>Details</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td data-label="When">{new Date(row.created_at).toLocaleString()}</td><td data-label="Action">{row.action}</td><td data-label="Actor reference">{row.user_id?.slice(0, 8) || "Not recorded"}</td><td data-label="Details"><code>{JSON.stringify(row.details || {})}</code></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="buyer-empty">No matching audit entries.</div>}</div>}
  </section></AuthenticatedLayout>;
}
