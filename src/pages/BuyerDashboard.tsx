import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Search, Heart, CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import DBPropertyCard, { type DBProperty } from "@/components/DBPropertyCard";
import ResourceState from "@/components/buyer/ResourceState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";
import { useBuyerResource } from "@/hooks/useBuyerResource";
import { attachmentPreview } from "@/lib/chatAttachments";
import type { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations"> & { properties: { title: string; city: string | null; state: string | null; image_url: string | null } | null };
type Thread = Tables<"chat_threads"> & { messages: { content: string; created_at: string; seen: boolean; sender_id: string }[]; agent: string | null };
type Transaction = Tables<"transactions"> & { properties: { title: string } | null };
const normalizeProperties = (rows: Tables<"properties">[]): DBProperty[] => rows.map(row => ({ ...row, listing_type: row.listing_type === "sale" ? "sale" : row.listing_type === "rental" ? "rental" : null }));
const displayDate = (value: string | null) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Date not recorded";
const label = (value: string | null) => value?.replace(/_/g, " ") || "Status not recorded";

export default function BuyerDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const view = params.get("view") || "overview";
  const [query, setQuery] = useState("");
  const favorites = useLocalFavorites("");
  const profileId = profile?.id;
  const userId = user?.id;
  const reservations = useBuyerResource<Reservation>(useCallback(async () => {
    if (!profileId) return { data: [], error: null };
    return await supabase.from("reservations").select("*, properties(title, city, state, image_url)").eq("buyer_id", profileId).order("created_at", { ascending: false });
  }, [profileId]));
  const threads = useBuyerResource<Thread>(useCallback(async () => {
    if (!profileId) return { data: [], error: null };
    const result = await supabase.from("chat_threads").select("*, messages(content, created_at, seen, sender_id)").eq("buyer_id", profileId).order("last_message_at", { ascending: false });
    if (result.error) return { data: null, error: result.error };
    const data = await Promise.all((result.data || []).map(async thread => {
      const participants = await supabase.rpc("get_chat_participants", { _thread_id: thread.id });
      if (participants.error) throw participants.error;
      return { ...thread, agent: participants.data?.find(person => person.id === thread.agent_id)?.full_name || null };
    }));
    return { data, error: null };
  }, [profileId]));
  const transactions = useBuyerResource<Transaction>(useCallback(async () => {
    if (!userId) return { data: [], error: null };
    return await supabase.from("transactions").select("*, properties(title)").eq("buyer_id", userId).order("created_at", { ascending: false });
  }, [userId]));
  const listings = useBuyerResource<DBProperty>(useCallback(async () => { const { data, error } = await supabase.from("properties").select("*").eq("is_verified", true).in("status", ["available", "for_sale", "for_rent"]).order("created_at", { ascending: false }).limit(4); return { data: data ? normalizeProperties(data) : null, error }; }, []));
  const saved = useBuyerResource<DBProperty>(useCallback(async () => {
    const ids = favorites.ids.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    if (!ids.length) return { data: [], error: null };
    const { data, error } = await supabase.from("properties").select("*").in("id", ids);
    return { data: data ? normalizeProperties(data) : null, error };
  }, [favorites.ids]));
  const unavailable = favorites.ids.filter(id => !saved.data.some(property => property.id === id));
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const upcoming = reservations.data.filter(row => ["requested", "confirmed", "reschedule_proposed"].includes(row.inspection_status) && (row.inspection_status === "reschedule_proposed" ? row.proposed_date || "" : row.viewing_date || "") >= today);
  const unread = threads.data.reduce((sum, thread) => sum + thread.messages.filter(message => !message.seen && message.sender_id !== profileId).length, 0);
  const activity = useMemo(() => reservations.data.slice(0, 5).map(row => ({ id: row.id, title: row.properties?.title || "Property unavailable", at: row.created_at, status: row.inspection_status })), [reservations.data]);
  const heading = view === "saved" ? "Your saved places." : view === "transactions" ? "Your transaction records." : `Hello, ${profile?.full_name?.split(" ")[0] || "there"}.`;
  if (!profile) return <AuthenticatedLayout><div className="buyer-empty"><h1>Profile unavailable</h1><p>Reload to retrieve your account before showing personal activity.</p><Button onClick={() => window.location.reload()}>Reload workspace</Button></div></AuthenticatedLayout>;
  return <AuthenticatedLayout><div className="buyer-page"><header className="buyer-page-heading"><div><p className="buyer-eyebrow">Your buyer workspace</p><h1>{heading}</h1><p>{view === "saved" ? "A collection kept on this device. Saves do not sync between accounts or devices." : view === "transactions" ? "Read-only information from your account. Financial operations remain locked." : "A little closer to your next place. Pick up where you left off."}</p></div><Button asChild><Link to="/properties">Explore properties <ArrowUpRight /></Link></Button></header>
    {view === "saved" ? <section aria-label="Saved properties"><ResourceState {...saved} empty={!favorites.ids.length} title="Saved properties" to="/properties" />{!saved.loading && !saved.error && <><div className="buyer-property-grid">{saved.data.map(property => <DBPropertyCard key={property.id} property={property} />)}</div>{unavailable.map(id => <div key={id} className="buyer-unavailable"><p>A saved listing is unavailable or cannot be viewed.</p><Button variant="outline" onClick={() => favorites.remove(id)}>Remove unavailable save</Button></div>)}</>}</section> : view === "transactions" ? <section aria-label="Transaction records"><div className="buyer-finance-note"><ShieldCheck /><p>This is a record view, not a wallet or checkout. No payment, release, dispute or completion actions are available here.</p></div><ResourceState {...transactions} empty={!transactions.data.length} title="Transaction records" />{!transactions.loading && !transactions.error && transactions.data.map(row => <article className="buyer-record" key={row.id}><div><h2>{row.properties?.title || "Property unavailable"}</h2><span className="buyer-status">{label(row.payment_status)}</span></div><dl><div><dt>Recorded amount</dt><dd>₦{row.amount.toLocaleString("en-NG")}</dd></div><div><dt>Created</dt><dd>{displayDate(row.created_at)}</dd></div>{row.released_at && <div><dt>Release date recorded</dt><dd>{displayDate(row.released_at)}</dd></div>}</dl>{row.property_id && <Link to={`/property/${row.property_id}`}>View property</Link>}</article>)}</section> : <>
    <form className="buyer-search" onSubmit={event => { event.preventDefault(); navigate(`/properties${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`); }}><Search /><label htmlFor="buyer-search" className="sr-only">Search properties</label><input id="buyer-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Where would you like to live?" /><Button type="submit">Find a place</Button></form>
    <div className="buyer-summary-grid">{[{ title: "Saved on this device", value: favorites.ids.length, icon: Heart, to: "/dashboard/buyer?view=saved", hint: "Local collection" }, { title: "Upcoming requests", value: reservations.loading || reservations.error ? "—" : upcoming.length, icon: CalendarCheck, to: "/dashboard/buyer/inspections", hint: "Confirm status with the agent" }, { title: "Unread messages", value: threads.loading || threads.error ? "—" : unread, icon: MessageCircle, to: "/messages", hint: "In returned conversations" }].map(({ title, value, icon: Icon, to, hint }) => <Link className="buyer-summary" key={title} to={to}><Icon /><span>{title}</span><strong>{value}</strong><p>{hint}</p><ArrowUpRight /></Link>)}</div>
    <div className="buyer-overview-grid"><section className="buyer-panel"><div className="buyer-section-heading"><h2>Your inspections</h2><Link to="/dashboard/buyer/inspections">Manage requests</Link></div><p className="buyer-section-note">Preferred times are requests until the agent confirms them.</p><ResourceState {...reservations} empty={!reservations.data.length} title="Inspection requests" to="/properties" />{!reservations.loading && !reservations.error && reservations.data.slice(0, 3).map(row => <Link className="buyer-inspection-preview" key={row.id} to="/dashboard/buyer/inspections"><span className="buyer-date-tile"><CalendarCheck />{displayDate(row.viewing_date)}</span><span><strong>{row.properties?.title || "Property unavailable"}</strong><span>{row.inspection_time || "Time not recorded"}</span><span className="buyer-status">{label(row.inspection_status)}</span></span><ArrowUpRight /></Link>)}</section>
    <section className="buyer-panel"><div className="buyer-section-heading"><h2>Recent conversations</h2><Link to="/messages">Open inbox</Link></div><ResourceState {...threads} empty={!threads.data.length} title="Conversations" to="/properties" />{!threads.loading && !threads.error && threads.data.slice(0, 3).map(thread => {
      const latest = [...thread.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return <Link className="buyer-conversation" key={thread.id} to={`/chat/${thread.id}`}><span className="buyer-initial" aria-hidden="true">{thread.agent?.[0] || "?"}</span><span><strong>{thread.agent || "Participant unavailable"}</strong><p>{latest ? `${latest.sender_id === profileId ? "You: " : ""}${attachmentPreview(latest.content)}` : "No messages yet"}</p>{latest && <time dateTime={latest.created_at}>{displayDate(latest.created_at)}</time>}</span><ArrowUpRight /></Link>;
    })}</section></div>
    <section className="buyer-collection"><div className="buyer-section-heading"><div><p className="buyer-eyebrow">From the marketplace</p><h2>Places to discover.</h2></div><Link to="/properties">View all properties <ArrowUpRight /></Link></div><p className="buyer-section-note">Latest reviewed listings, not personalized recommendations.</p><ResourceState {...listings} empty={!listings.data.length} title="Available properties" to="/properties" />{!listings.loading && !listings.error && <div className="buyer-property-grid">{listings.data.map(property => <DBPropertyCard key={property.id} property={property} />)}</div>}</section>
    <div className="buyer-overview-grid"><section className="buyer-panel"><div className="buyer-section-heading"><h2>Inspection activity</h2><Link to="/dashboard/buyer/inspections">View history</Link></div><ResourceState {...reservations} empty={!activity.length} title="Inspection activity" to="/properties" />{!reservations.loading && !reservations.error && <ol className="buyer-activity">{activity.map(row => <li key={row.id}><div><strong>Inspection request created</strong><p>{row.title}</p><span>{label(row.status)} · current status</span></div><time dateTime={row.at}>{displayDate(row.at)}</time></li>)}</ol>}</section><section className="buyer-profile-guide"><p className="buyer-eyebrow">Your account</p><h2>Make it yours.</h2><p>Keep your name and contact details up to date. Identity review is separate from registration.</p><dl><div><dt>Email</dt><dd>{user?.email_confirmed_at ? "Verified" : "Not verified"}</dd></div><div><dt>Identity</dt><dd>{profile?.kyc_verified ? "Verified" : "Review requirements"}</dd></div></dl><Link to="/settings">Profile & settings <ArrowUpRight /></Link><Link to="/verification">Identity verification <ArrowUpRight /></Link><p>Financial operations remain locked.</p></section></div>
    </>}
  </div></AuthenticatedLayout>;
}
