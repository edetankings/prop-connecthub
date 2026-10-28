import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarCheck, Check, ChevronLeft, ChevronRight, Clock3, FileCheck2, FileText, LifeBuoy, Mail, MessageSquare, RefreshCw, Search, Settings2, ShieldCheck, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialAvailability } from "@/hooks/useFinancialAvailability";
import { Button } from "@/components/ui/button";
import SubscriptionControl from "./SubscriptionControl";

function usePanel<T>(loader: () => Promise<T>, active: boolean, refreshKey: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active) { setData(null); setLoading(false); return; }
    let current = true;
    setLoading(true); setError(false); setData(null);
    void loader().then(result => { if (current) setData(result); }).catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [loader, active, refreshKey, attempt]);
  return { data, loading, error, retry: () => setAttempt(value => value + 1) };
}

type Review = { id: string; title: string; detail: string; kind: "Property" | "KYC"; createdAt: string; image?: string | null; to: string };
type ReviewResult = { rows: Review[]; total: number; propertyTotal: number; kycTotal: number };
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
};
function PanelError({ title, retry, button }: { title: string; retry: () => void; button: string }) {
  return <div role="alert" className="admin-panel-empty"><p>{title}</p><Button variant="outline" size="sm" onClick={retry}>{button}</Button></div>;
}
function PanelHeading({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <header className="admin-panel-heading"><h2>{icon}{title}</h2>{children}</header>;
}

function PlatformControls() {
  const finance = useFinancialAvailability();
  return <section className="admin-panel admin-platform-panel" aria-label="Platform controls">
    <PanelHeading icon={<Settings2 aria-hidden="true" />} title="Platform controls" />
    <div className="admin-platform-content"><SubscriptionControl compact />
      <Link className="admin-text-link" to="/admin?view=subscriptions">Manage subscriptions</Link>
      <div className="admin-availability-list">
        <Link to="/admin/feature-management#waitlist-heading"><Users aria-hidden="true" /><span>Waitlist</span><span className="admin-status">Not configured</span></Link>
        <Link to="/admin/feature-management#waitlist-announcement"><Mail aria-hidden="true" /><span>Waitlist email</span><span className="admin-status admin-status-pending">Preview only</span></Link>
        <Link to="/admin/secure-payments"><Wallet aria-hidden="true" /><span>Payments</span><span className={`admin-status ${finance.enabled ? "admin-status-success" : "admin-status-muted"}`}>{finance.enabled ? "Configured" : "Unavailable"}</span></Link>
      </div>
      <p className="admin-panel-note"><ShieldCheck aria-hidden="true" />Subscription settings do not enable payments.</p>
    </div>
  </section>;
}

export default function OperationsOverview() {
  const { isAdmin } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const metricsLoader = useCallback(async () => {
    const results = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "under_verification"),
      supabase.from("kyc_verifications").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
      supabase.from("reservations").select("id", { count: "exact", head: true }).eq("inspection_status", "requested"),
    ]);
    if (results.some(result => result.error || result.count == null)) throw new Error("Counts unavailable");
    return results.map(result => result.count!);
  }, []);
  const reviewsLoader = useCallback(async (): Promise<ReviewResult> => {
    const [properties, kyc] = await Promise.all([
      supabase.from("properties").select("id,title,city,state,property_code,image_url,created_at", { count: "exact" }).eq("status", "under_verification").order("created_at", { ascending: false }).limit(100),
      supabase.from("kyc_verifications").select("id,user_id,submitted_at", { count: "exact" }).eq("kyc_status", "pending").order("submitted_at", { ascending: false }).limit(100),
    ]);
    if (properties.error || kyc.error) throw new Error("Review records unavailable");
    const ids = [...new Set((kyc.data || []).map(row => row.user_id))];
    const profiles = ids.length ? await supabase.from("profiles").select("user_id,full_name,profile_type").in("user_id", ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const rows: Review[] = [
      ...(properties.data || []).map(row => ({ id: row.id, title: row.title, detail: [...new Set([row.city, row.state, row.property_code].filter(Boolean))].join(" · "), kind: "Property" as const, image: row.image_url, createdAt: row.created_at, to: `/admin?view=moderation&property=${encodeURIComponent(row.id)}` })),
      ...(kyc.data || []).map(row => {
        const profile = profiles.data?.find(item => item.user_id === row.user_id);
        return { id: row.id, title: profile?.full_name || "Identity verification", detail: `${profile?.profile_type === "builder" ? "Builder" : profile?.profile_type === "agent" ? "Agent" : "Account"} identity verification`, kind: "KYC" as const, createdAt: row.submitted_at, to: `/admin?view=verification&user=${encodeURIComponent(row.user_id)}` };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { rows, total: (properties.count ?? properties.data?.length ?? 0) + (kyc.count ?? kyc.data?.length ?? 0), propertyTotal: properties.count ?? properties.data?.length ?? 0, kycTotal: kyc.count ?? kyc.data?.length ?? 0 };
  }, []);
  const auditLoader = useCallback(async () => {
    const result = await supabase.from("audit_logs").select("id,action,details,user_id,created_at").order("created_at", { ascending: false }).limit(3);
    if (result.error) throw result.error;
    return result.data || [];
  }, []);
  const supportLoader = useCallback(async () => {
    const result = await supabase.from("support_tickets").select("id,subject,status,created_at", { count: "exact" }).eq("status", "open").order("created_at", { ascending: false }).limit(2);
    if (result.error) throw result.error;
    return { rows: result.data || [], count: result.count ?? result.data?.length ?? 0 };
  }, []);
  const metrics = usePanel(metricsLoader, isAdmin, refreshKey);
  const reviews = usePanel(reviewsLoader, isAdmin, refreshKey);
  const audit = usePanel(auditLoader, isAdmin, refreshKey);
  const support = usePanel(supportLoader, isAdmin, refreshKey);
  const filtered = useMemo(() => (reviews.data?.rows || []).filter(row => (filter === "All" || row.kind === filter) && `${row.title} ${row.detail}`.toLowerCase().includes(query.trim().toLowerCase())), [reviews.data, filter, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  if (!isAdmin) return null;

  const metricCards = [
    { label: "Registered profiles", note: "Buyers, agents & builders", to: "/admin?view=users", icon: Users },
    { label: "Properties awaiting review", note: "Review needed", to: "/admin?view=moderation", icon: Building2 },
    { label: "Pending KYC", note: "Identity submissions", to: "/admin?view=verification", icon: FileCheck2 },
    { label: "Requested inspections", note: "View schedules", to: "/admin/inspections", icon: CalendarCheck },
  ];
  const busy = metrics.loading || reviews.loading || audit.loading || support.loading;
  return <section className="admin-dashboard" aria-label="Authorized platform summary">
    <header className="admin-dashboard-heading"><div><p className="admin-eyebrow">{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })}</p><h1>Your operations, at a glance</h1><p>Review submissions and keep the marketplace moving.</p></div><Button variant="outline" onClick={() => setRefreshKey(value => value + 1)} disabled={busy} aria-label="Refresh summary"><RefreshCw aria-hidden="true" className={busy ? "animate-spin" : ""} />Refresh</Button></header>
    {metrics.error ? <PanelError title="Summary unavailable" retry={metrics.retry} button="Retry summary" /> : <div className="admin-priority-metrics" aria-label="Priority platform metrics" aria-busy={metrics.loading}>{metricCards.map((item, index) => <Link key={item.label} className={`admin-metric${index === 1 || index === 2 ? " admin-metric-warning" : ""}`} to={item.to}><span className="admin-metric-icon"><item.icon aria-hidden="true" /></span><div><h2>{item.label}</h2><strong>{metrics.data ? metrics.data[index].toLocaleString() : "—"}</strong><p>{metrics.loading ? "Loading count…" : item.note}</p><span className="sr-only">View records</span></div></Link>)}</div>}
    <div className="admin-dashboard-grid">
      <section className="admin-panel admin-review-panel" aria-labelledby="admin-review-heading">
        <header className="admin-panel-heading admin-review-heading"><div><h2 id="admin-review-heading"><FileText aria-hidden="true" />Reviews needing attention</h2><p>Property and identity submissions awaiting a decision.</p></div></header>
        <div className="admin-review-tools"><div className="admin-filter-pills" role="group" aria-label="Filter review type">{[{ label: "All", value: "All", total: reviews.data?.total }, { label: "Properties", value: "Property", total: reviews.data?.propertyTotal }, { label: "KYC", value: "KYC", total: reviews.data?.kycTotal }].map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPage(1); }}>{item.label}{item.total != null && <span>{item.total}</span>}</button>)}</div><label className="admin-table-search"><Search aria-hidden="true" /><span className="sr-only">Search loaded review submissions</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search these submissions" /></label></div>
        {reviews.error ? <PanelError title="Review queue unavailable" retry={reviews.retry} button="Retry reviews" /> : reviews.loading ? <p role="status" className="admin-panel-loading">Loading review submissions…</p> : <>
          <div className="admin-review-table-wrap"><table className="admin-review-table"><caption className="sr-only">Pending property and KYC submissions</caption><thead><tr><th>Submission</th><th>Type</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{shown.map(row => <tr key={`${row.kind}-${row.id}`}><td data-label="Submission"><div className="admin-submission">{row.image ? <img src={row.image} alt="" loading="lazy" /> : <span className={`admin-submission-avatar${row.kind === "KYC" ? " admin-submission-person" : ""}`}>{row.kind === "KYC" ? row.title.split(" ").slice(0, 2).map(word => word[0]).join("") : <Building2 aria-hidden="true" />}</span>}<span><strong>{row.title}</strong><small>{row.detail || "Property submission"}</small></span></div></td><td data-label="Type">{row.kind}</td><td data-label="Submitted"><time dateTime={row.createdAt}>{dateLabel(row.createdAt)}</time></td><td data-label="Status"><span className="admin-status admin-status-pending"><span aria-hidden="true">•</span>Pending</span></td><td data-label="Action"><Link className="admin-review-action" to={row.to} aria-label={`Review ${row.title}`}>Review</Link></td></tr>)}</tbody></table></div>
          {shown.length === 0 && <div className="admin-panel-empty"><Check aria-hidden="true" /><h3>{query || filter !== "All" ? "No matching submissions" : "You’re all caught up"}</h3><p>{query || filter !== "All" ? "Try another search or review type." : "New property and identity submissions will appear here."}</p></div>}
          <footer className="admin-table-footer"><p>{filtered.length ? `Showing ${(currentPage - 1) * 5 + 1}–${Math.min(currentPage * 5, filtered.length)} of ${filtered.length}` : "No submissions to display"}{reviews.data && reviews.data.total > reviews.data.rows.length && <small>Latest 100 submissions per type. Open a review section for other records.</small>}</p><nav aria-label="Review queue pages"><button type="button" aria-label="Previous review page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></button><span>Page {currentPage} of {pages}</span><button type="button" aria-label="Next review page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight /></button></nav></footer>
        </>}
      </section>
      <PlatformControls />
      <section className="admin-panel admin-audit-panel" aria-label="Recent audit activity"><PanelHeading icon={<Clock3 aria-hidden="true" />} title="Recent audit activity"><Link to="/admin/audit" className="admin-text-link">View audit log</Link></PanelHeading>
        {audit.error ? <PanelError title="Audit activity unavailable" retry={audit.retry} button="Retry activity" /> : audit.loading ? <p role="status" className="admin-panel-loading">Loading recent activity…</p> : audit.data?.length ? <ul className="admin-activity-list">{audit.data.map(row => {
          const details = row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
          const title = row.action === "set_subscriptions_enabled" && typeof details.enabled === "boolean" ? `Subscription requirement turned ${details.enabled ? "ON" : "OFF"}` : row.action.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase());
          return <li key={row.id}><span className="admin-activity-icon"><ShieldCheck aria-hidden="true" /></span><div><strong>{title}</strong><small>{row.user_id ? `Actor ${row.user_id.slice(0, 8)}` : "System action"}</small></div><time dateTime={row.created_at}>{dateLabel(row.created_at)}</time></li>;
        })}</ul> : <p className="admin-panel-empty">No audit activity has been recorded.</p>}
      </section>
      <section className="admin-panel admin-support-panel" aria-label="Support requests"><PanelHeading icon={<MessageSquare aria-hidden="true" />} title="Support requests">{support.data && <span className="admin-status admin-status-pending">{support.data.count} open</span>}</PanelHeading>
        {support.error ? <PanelError title="Support requests unavailable" retry={support.retry} button="Retry support" /> : support.loading ? <p role="status" className="admin-panel-loading">Loading support requests…</p> : support.data?.rows.length ? <ul className="admin-support-list">{support.data.rows.map(row => <li key={row.id}><Link to="/admin?view=support"><LifeBuoy aria-hidden="true" /><span><strong>{row.subject || "Support request"}</strong><time dateTime={row.created_at}>{dateLabel(row.created_at)}</time></span><span className="admin-status admin-status-pending">Open</span></Link></li>)}</ul> : <p className="admin-panel-empty">No open support requests.</p>}
        <Link className="admin-text-link admin-panel-footer-link" to="/admin?view=support">Open support inbox</Link>
      </section>
    </div>
  </section>;
}
