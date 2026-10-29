import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, CalendarCheck, MessageCircle, UserRound, Search, Menu, ReceiptText, Building2, ShieldCheck, Users, ScrollText, Plus, CreditCard, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import NotificationBell from "@/components/NotificationBell";
import AgentAccountMenu from "@/components/professional/AgentAccountMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.jpg";
import AdminShell from "@/components/admin/AdminShell";

const items = [
  { label: "Overview", to: "/dashboard/buyer", icon: Home },
  { label: "Saved properties", to: "/dashboard/buyer?view=saved", icon: Heart },
  { label: "Inspections", to: "/dashboard/buyer/inspections", icon: CalendarCheck },
  { label: "Messages", to: "/messages", icon: MessageCircle },
  { label: "Prop Connect AI", to: "/ai-assistant", icon: Sparkles },
  { label: "Transaction records", to: "/dashboard/buyer?view=transactions", icon: ReceiptText },
  { label: "Profile & settings", to: "/settings", icon: UserRound },
];
function StandardWorkspaceShell({ children, role = "buyer" }: { children: ReactNode; role?: "buyer" | "agent" | "builder" | "admin" }) {
  const { profile, user, signOut } = useAuth();
  const agentWorkspace = role === "agent";
  const buyerWorkspace = role === "buyer";
  const professional = role === "agent" || role === "builder";
  const admin = role === "admin";
  const base = `/dashboard/${role}`;
  const menu = admin ? [
    { label: "Operations overview", to: "/admin", icon: Home },
    { label: "User directory", to: "/admin?view=users", icon: Users },
    { label: "Verification review", to: "/admin?view=verification", icon: ShieldCheck },
    { label: "Property moderation", to: "/admin?view=moderation", icon: Building2 },
    { label: "Inspections", to: "/admin/inspections", icon: CalendarCheck },
    { label: "Deal records", to: "/admin/deals", icon: ReceiptText },
    { label: "My messages", to: "/messages", icon: MessageCircle },
    { label: "Waitlist & subscriptions", to: "/admin/feature-management", icon: CreditCard },
    { label: "Audit log", to: "/admin/audit", icon: ScrollText },
    { label: "Account settings", to: "/settings", icon: UserRound },
  ] : professional ? [
    { label: role === "builder" ? "Developer overview" : "Agent overview", to: base, icon: Home },
    ...(agentWorkspace ? [{ label: "Add property", to: "/add-property", icon: Plus },{ label: "Subscription & payments", to: "/payments", icon: CreditCard },{ label: "Earnings & referrals", to: "/earnings", icon: Wallet },{ label: "Deals & transactions", to: "/dashboard/agent/deals", icon: ReceiptText }] : []),
    { label: "My listings", to: `${base}?view=listings`, icon: Building2 },
    { label: "Inquiries", to: `${base}?view=inquiries`, icon: MessageCircle },
    { label: "Inspections", to: role === "agent" ? "/dashboard/agent/inspections" : `${base}?view=inspections`, icon: CalendarCheck },
    { label: "Messages", to: "/messages", icon: MessageCircle },
    { label: "Prop Connect AI", to: "/ai-assistant", icon: Sparkles },
    { label: "Profile & settings", to: "/settings", icon: UserRound },
    { label: "Identity verification", to: "/verification", icon: UserRound },
  ] : items;
  const workspaceLabel = admin ? "Admin operations" : role === "builder" ? "Developer workspace" : role === "agent" ? "Agent workspace" : "Buyer workspace";
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const logout = async () => {
    if (leaving) return;
    setLeaving(true); setError("");
    try { await signOut(); setOpen(false); navigate("/login"); }
    catch { setError("Unable to sign out. Please try again."); }
    finally { setLeaving(false); }
  };
  const links = <><nav aria-label={workspaceLabel}>{menu.map(({ label, to, icon: Icon }) => {
    const destination = new URL(to, window.location.origin);
    const active = (location.pathname === destination.pathname || to === "/admin" && location.pathname === "/admin/overview" || to === "/messages" && location.pathname.startsWith("/chat/")) && (destination.searchParams.get("view") || "overview") === (new URLSearchParams(location.search).get("view") || "overview");
    return <Link key={to} to={to} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon aria-hidden="true" />{label}</Link>;
  })}</nav><div className="buyer-nav-foot"><Link to="/properties" onClick={() => setOpen(false)}><Search />Explore properties</Link><p>Financial operations remain locked.</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={leaving} onClick={() => void logout()}>{leaving ? "Signing outâ€¦" : "Sign out"}</button></div></>;
  return <div className={`buyer-workspace ${admin ? "admin-workspace" : professional ? `professional-workspace${agentWorkspace ? " agent-workspace" : ""}` : " customer-workspace"}`}><aside className="buyer-desktop-sidebar"><Link to="/" className="buyer-brand"><img src={logo} alt="" />PROP-CONNECT</Link><p className="buyer-eyebrow">{admin || professional ? workspaceLabel : "Your property workspace"}</p>{agentWorkspace && <div className="agent-sidebar-profile">{profile?.avatar_url?<img src={profile.avatar_url} alt="Your profile"/>:<span>{profile?.full_name?.[0]||"A"}</span>}<strong>{profile?.full_name||"Your account"}</strong><p>{profile?.kyc_verified?"Verified agent":"Verification pending"}</p>{profile?.location && <small>{profile.location}</small>}</div>}{links}</aside><div className="buyer-workspace-body"><header className="buyer-topbar"><Button className="buyer-menu-button" variant="outline" size="icon" aria-label={admin ? "Open admin navigation" : professional ? "Open professional navigation" : "Open buyer navigation"} onClick={() => setOpen(true)}><Menu /></Button>{agentWorkspace?<><Link className="agent-mobile-brand" to="/">PROP-CONNECT</Link><form className="agent-workspace-search" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);navigate(`/dashboard/agent?view=listings&q=${encodeURIComponent(String(data.get("q")||"").trim())}`);}}><Search aria-hidden="true"/><label className="sr-only" htmlFor="agent-workspace-search">Search your property listings</label><input id="agent-workspace-search" name="q" placeholder="Search your property listings…"/><button type="submit" className="sr-only">Search listings</button></form></>:<>{buyerWorkspace && <Link to="/" className="agent-mobile-brand">PROP-CONNECT</Link>}<Link to="/properties" className="buyer-market-link"><Search />Explore properties</Link></>}<div><ThemeToggle /><NotificationBell />{agentWorkspace || buyerWorkspace ? <AgentAccountMenu role={buyerWorkspace ? "buyer" : "agent"} name={profile?.full_name || "Your account"} avatar={profile?.avatar_url} leaving={leaving} onSignOut={() => void logout()} /> : <Link to="/settings" className="buyer-account"><span aria-hidden="true">{profile?.full_name?.[0] || user?.email?.[0] || "U"}</span><span>{profile?.full_name || "Your account"}</span></Link>}</div></header><main className="buyer-workspace-main">{children}</main></div>{(agentWorkspace || buyerWorkspace) && <nav className="agent-mobile-bottom-nav" aria-label={buyerWorkspace ? "Buyer quick navigation" : "Agent quick navigation"}>{(buyerWorkspace ? [{label:"Home",to:"/dashboard/buyer",icon:Home},{label:"Saved",to:"/dashboard/buyer?view=saved",icon:Heart},{label:"Explore",to:"/properties",icon:Search},{label:"Chats",to:"/messages",icon:MessageCircle}] : [{label:"Home",to:"/dashboard/agent",icon:Home},{label:"Listings",to:"/dashboard/agent?view=listings",icon:Building2},{label:"Add",to:"/add-property",icon:Plus},{label:"Enquiries",to:"/dashboard/agent?view=inquiries",icon:MessageCircle}]).map(({label,to,icon:Icon})=><Link key={label} to={to} aria-current={location.pathname+location.search===to?"page":undefined} className={label==="Add"?"agent-bottom-add":undefined}><Icon/>{label}</Link>)}<button type="button" onClick={()=>setOpen(true)}><Menu/>More</button></nav>}<Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className={`buyer-navigation-sheet${agentWorkspace || buyerWorkspace ? " agent-navigation-sheet" : ""}`}><SheetTitle>{workspaceLabel}</SheetTitle><SheetDescription>Your properties, conversations and account.</SheetDescription>{links}</SheetContent></Sheet></div>;
}

export default function WorkspaceShell({ children, role = "buyer" }: { children: ReactNode; role?: "buyer" | "agent" | "builder" | "admin" }) {
  return role === "admin" ? <AdminShell>{children}</AdminShell> : <StandardWorkspaceShell role={role}>{children}</StandardWorkspaceShell>;
}
