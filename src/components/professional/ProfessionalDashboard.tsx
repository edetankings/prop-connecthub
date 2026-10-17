import { useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Building2, Plus, Search, CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import ResourceState from "@/components/buyer/ResourceState";
import Inspections from "@/pages/Inspections";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerResource } from "@/hooks/useBuyerResource";
import { supabase } from "@/integrations/supabase/client";
import { attachmentPreview } from "@/lib/chatAttachments";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;
type Inquiry = Tables<"chat_threads"> & {
  messages: { content: string; created_at: string; sender_id: string; seen: boolean }[];
  properties: { title: string } | null;
  buyer: string | null;
};
const locked = new Set(["payment_pending", "transaction_in_progress", "sold", "rented"]);
const active = new Set(["available", "for_sale", "for_rent"]);
const statusText = (value: string) => value.replace(/_/g, " ");
const dateText = (value: string) => new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

export default function ProfessionalDashboard({ role }: { role: "agent" | "builder" }) {
  const { profile, isAdmin } = useAuth();
  const owner = profile?.id;
  const allowed = profile?.profile_type === role && !isAdmin;
  const [params] = useSearchParams();
  const view = params.get("view") || "overview";
  const base = `/dashboard/${role}`;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [pending, setPending] = useState(false);
  const deleteLock = useRef(false);
  const [actionError, setActionError] = useState("");
  const listings = useBuyerResource<Property>(useCallback(async () => {
    if (!owner || !allowed) return { data: [], error: null };
    return await supabase.from("properties").select("*").eq("agent_id", owner).order("created_at", { ascending: false });
  }, [owner, allowed]));
  const reservations = useBuyerResource<Tables<"reservations">>(useCallback(async () => {
    if (!owner || !allowed) return { data: [], error: null };
    return await supabase.from("reservations").select("*").eq("agent_id", owner).order("created_at", { ascending: false });
  }, [owner, allowed]));
  const inquiries = useBuyerResource<Inquiry>(useCallback(async () => {
    if (!owner || !allowed) return { data: [], error: null };
    const result = await supabase.from("chat_threads").select("*, messages(content, created_at, sender_id, seen), properties(title)").eq("agent_id", owner).order("last_message_at", { ascending: false });
    if (result.error) throw result.error;
    const data = await Promise.all((result.data || []).map(async thread => {
      const people = await supabase.rpc("get_chat_participants", { _thread_id: thread.id });
      if (people.error) throw people.error;
      return { ...thread, buyer: people.data?.find(person => person.id === thread.buyer_id)?.full_name || null };
    }));
    return { data, error: null };
  }, [owner, allowed]));
  const removeDraft = async () => {
    if (!deleting || !owner || !allowed || deleting.agent_id !== owner || deleting.status !== "draft" || deleteLock.current) return;
    deleteLock.current = true; setPending(true); setActionError("");
    try {
      const { data, error } = await supabase.from("properties").delete().eq("id", deleting.id).eq("agent_id", owner).eq("status", "draft").select("id").maybeSingle();
      if (error || !data) throw error || new Error("Deletion not confirmed");
      setDeleting(null); listings.retry();
    } catch { setActionError("Unable to delete this draft. It may no longer be editable. Please retry or refresh the list."); }
    finally { deleteLock.current = false; setPending(false); }
  };
  if (!allowed) return <AuthenticatedLayout><div className="buyer-empty"><h1>Professional workspace unavailable</h1><p>Use the workspace assigned to your account.</p><Button asChild><Link to="/dashboard">Return to your dashboard</Link></Button></div></AuthenticatedLayout>;
  const shown = listings.data.filter(row => (!search.trim() || [row.title, row.city, row.state, row.property_code].some(value => value?.toLowerCase().includes(search.trim().toLowerCase()))) && (filter === "all" || row.status === filter));
  const showListings = view === "listings" ? shown : listings.data.slice(0, 4);
  const title = view === "listings" ? "Your property portfolio." : view === "inquiries" ? "Conversations with possibility." : view === "inspections" ? "Your inspection requests." : role === "builder" ? "Your developer workspace." : "Your next opportunity starts here.";
  return <AuthenticatedLayout><div className="professional-page buyer-page">
    <header className="buyer-page-heading"><div><p className="buyer-eyebrow">PROP-CONNECT / {role === "builder" ? "Builder & developer" : "Agent"}</p><h1>{title}</h1><p>{view === "listings" ? "Manage your own property listings. Changes remain subject to moderation." : view === "inquiries" ? "Real property conversations, without invented CRM stages." : `Welcome back, ${profile.full_name.split(" ")[0] || "there"}. Your listings, inquiries and inspections in one place.`}</p></div><Button asChild><Link to="/add-property"><Plus />Add property</Link></Button></header>
    {view === "inspections" ? <Inspections mode="agent" embedded /> : <>
      {view === "overview" && <><div className="professional-summary-grid">{[
        { title: "Total listings", value: listings.data.length, resource: listings, icon: Building2, to: `${base}?view=listings` },
        { title: "Active listings", value: listings.data.filter(row => row.is_verified && active.has(row.status)).length, resource: listings, icon: Building2, to: `${base}?view=listings` },
        { title: "Awaiting review", value: listings.data.filter(row => row.status === "under_verification").length, resource: listings, icon: Search, to: `${base}?view=listings` },
        { title: "Inspection requests", value: reservations.data.filter(row => row.inspection_status === "requested").length, resource: reservations, icon: CalendarCheck, to: role === "agent" ? "/dashboard/agent/inspections" : `${base}?view=inspections` },
      ].map(({ title: label, value, resource, icon: Icon, to }) => <Link key={label} className="buyer-summary" to={to}><Icon /><span>{label}</span><strong>{resource.loading || resource.error ? "—" : value}</strong><p>From returned account records</p><ArrowUpRight /></Link>)}</div>
      <section className="professional-readiness"><div><p className="buyer-eyebrow">Your professional account</p><h2>{profile.kyc_verified ? "Identity review complete." : "Prepare your professional profile."}</h2><p>{profile.kyc_verified ? "Verification does not remove listing moderation or subscription requirements." : "Registration is not professional approval. Review the required documents before submitting."} Financial operations remain locked.</p></div><Link to="/verification">View verification <ArrowUpRight /></Link><Link to="/settings">Profile settings <ArrowUpRight /></Link></section></>}
      {view !== "inquiries" && <section><div className="buyer-section-heading"><div><p className="buyer-eyebrow">{role === "builder" ? "Managed property listings" : "Your portfolio"}</p><h2>{view === "listings" ? "Listing management" : "Properties in focus"}</h2></div>{view !== "listings" && <Link to={`${base}?view=listings`}>Manage all listings <ArrowUpRight /></Link>}</div>
      {view === "listings" && <div className="professional-list-controls"><label><span className="sr-only">Search your listings</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, location or property code" /></label><label><span className="sr-only">Listing status</span><select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option>{Array.from(new Set(listings.data.map(row => row.status))).sort().map(value => <option key={value} value={value}>{statusText(value)}</option>)}</select></label><p role="status">{listings.loading || listings.error ? "Results unavailable" : `${shown.length} matching listings`}</p></div>}
      <ResourceState {...listings} empty={!listings.data.length} title="Property listings" to="/add-property" action="Create a listing" />{!listings.loading && !listings.error && <>{view === "listings" && listings.data.length > 0 && !shown.length && <div className="buyer-empty"><h3>No listings match your filters.</h3><Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Button></div>}<div className="professional-listing-grid">{showListings.map(row => <article key={row.id} className="professional-property-card"><Link to={`/property/${row.id}`} className="professional-property-image"><img src={row.image_url || row.images?.[0] || "/placeholder.svg"} alt={row.title} loading="lazy" width={960} height={640} onError={event => { if (!event.currentTarget.src.endsWith("/placeholder.svg")) event.currentTarget.src = "/placeholder.svg"; }} /><span className="buyer-status">{statusText(row.status)}</span></Link><div className="professional-property-copy"><p>{row.property_type} / {row.listing_type === "rental" ? "For rent" : row.listing_type === "sale" ? "For sale" : "Listing"}</p><h3>{row.title}</h3><p>{[row.city, row.state].filter(Boolean).join(", ") || "Location not provided"}</p><strong>₦{row.price.toLocaleString("en-NG")}</strong>{row.property_code && <small>{row.property_code}</small>}<div className="professional-property-actions"><Link to={`/property/${row.id}`}>Preview <ArrowUpRight /></Link>{!locked.has(row.status) && <Link to={`/add-property?edit=${row.id}`}>Edit listing</Link>}{row.status === "draft" && <button type="button" onClick={() => { setActionError(""); setDeleting(row); }}>Delete draft</button>}</div>{locked.has(row.status) && <p className="professional-lock-note">Editing locked by the recorded transaction status.</p>}</div></article>)}</div></>}
      {role === "builder" && <p className="professional-scope-note">This workspace manages property listings. Construction progress, phases and multi-unit inventory are not tracked.</p>}</section>}
      {view !== "listings" && <section className="professional-inquiries"><div className="buyer-section-heading"><div><p className="buyer-eyebrow">Property conversations</p><h2>{view === "inquiries" ? "Your inquiries" : "Recent inquiries"}</h2></div><Link to="/messages">Open messages <MessageCircle /></Link></div><ResourceState {...inquiries} empty={!inquiries.data.length} title="Inquiries" to={`${base}?view=listings`} action="Manage listings" />{!inquiries.loading && !inquiries.error && <div className="professional-inquiry-grid">{(view === "inquiries" ? inquiries.data : inquiries.data.slice(0, 3)).map(row => {
        const latest = [...row.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const unread = row.messages.filter(message => !message.seen && message.sender_id !== owner).length;
        return <Link to={`/chat/${row.id}`} className="professional-inquiry" key={row.id}><div><span className="buyer-initial">{row.buyer?.[0] || "?"}</span><h3>{row.buyer || "Participant unavailable"}</h3>{unread > 0 && <span className="buyer-status">{unread} unread</span>}</div><strong>{row.properties?.title || "Property context unavailable"}</strong><p>{latest ? `${latest.sender_id === owner ? "You: " : ""}${attachmentPreview(latest.content)}` : "No messages yet"}</p><footer><time dateTime={latest?.created_at || row.created_at}>{dateText(latest?.created_at || row.created_at)}</time><span>Open conversation <ArrowUpRight /></span></footer></Link>;
      })}</div>}</section>}
      {view === "overview" && <section className="professional-inspection-shortcut"><CalendarCheck /><div><h2>Prepare for your next inspection.</h2><p>Respond to requested times, propose an alternative or review inspection history. No automatic confirmations.</p><ResourceState {...reservations} title="Inspection requests" /></div><Button asChild variant="outline"><Link to={role === "agent" ? "/dashboard/agent/inspections" : `${base}?view=inspections`}>Manage inspections</Link></Button></section>}
    </>}
    <Dialog open={!!deleting} onOpenChange={open => { if (!open && !pending) setDeleting(null); }}><DialogContent className="professional-delete-dialog"><DialogTitle>Delete this draft?</DialogTitle><DialogDescription>{deleting?.title}. Only your own draft will be deleted. Uploaded storage files are not removed by this action.</DialogDescription>{actionError && <p role="alert">{actionError}</p>}<div><Button variant="outline" disabled={pending} onClick={() => setDeleting(null)}>Keep draft</Button><Button variant="destructive" disabled={pending} onClick={() => void removeDraft()}>{pending ? "Deleting…" : "Delete draft"}</Button></div></DialogContent></Dialog>
  </div></AuthenticatedLayout>;
}
