import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { adminNavigation, isAdminDestination } from "./adminNavigation";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const destinations = adminNavigation.flatMap(group => group.items);
  const current = destinations.find(item => isAdminDestination(item, location.pathname, location.search));
  const initials = (profile?.full_name || user?.email || "Administrator").slice(0, 1).toUpperCase();
  const signOutNow = async () => {
    if (leaving) return;
    setLeaving(true); setLogoutError("");
    try { await signOut(); navigate("/login"); }
    catch { setLogoutError("Could not sign out. Please retry."); }
    finally { setLeaving(false); }
  };
  const findSection = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim().toLowerCase();
    const match = term && (destinations.find(item => item.label.toLowerCase() === term) || destinations.find(item => item.label.toLowerCase().includes(term)));
    if (!match) { setSearchError("Choose an admin section from the suggestions."); return; }
    navigate(match.to); setQuery(""); setSearchError(""); setOpen(false);
  };
  const navigation = <>
    <nav aria-label="Admin operations" className="admin-nav">
      {adminNavigation.map(group => <div className="admin-nav-group" key={group.label}>
        <p>{group.label}</p>
        {group.items.map(item => <Link key={item.to} to={item.to} aria-current={isAdminDestination(item, location.pathname, location.search) ? "page" : undefined} onClick={() => setOpen(false)}><item.icon aria-hidden="true" /><span>{item.label}</span></Link>)}
      </div>)}
    </nav>
    <div className="admin-sidebar-foot">
      <Link to="/settings" className="admin-sidebar-account" onClick={() => setOpen(false)}><span className="admin-avatar">{initials}</span><span><strong>{profile?.full_name || "Administrator"}</strong><small>Administrator account</small></span></Link>
      <div><Link to="/settings" onClick={() => setOpen(false)}><Settings aria-hidden="true" />Account settings</Link><button type="button" onClick={() => void signOutNow()} disabled={leaving}><LogOut aria-hidden="true" />{leaving ? "Signing out…" : "Sign out"}</button></div>
      {logoutError && <p role="alert">{logoutError}</p>}
    </div>
  </>;
  const brand = <Link to="/admin" className="admin-brand"><Building2 aria-hidden="true" /><span>PROP-CONNECT<small>Admin portal</small></span></Link>;
  const financeSection = current?.label === "Finance records";
  const referralSection = current?.label === "Referrals & matrix";

  return <div className="admin-portal">
    <aside className="admin-sidebar">{brand}{navigation}</aside>
    <div className="admin-body">
      <header className="admin-topbar">
        <button type="button" className="admin-menu-trigger" aria-label="Open admin navigation" onClick={() => setOpen(true)}><Menu /></button>
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link to="/admin">Administration</Link><span aria-hidden="true">/</span><span>{current?.label || (location.pathname === "/settings" ? "Account settings" : "Workspace")}</span></nav>
        <div className="admin-topbar-tools">
          <form onSubmit={findSection} className="admin-section-search" role="search"><Search aria-hidden="true" /><label htmlFor="admin-section-search" className="sr-only">Find an admin section</label><input id="admin-section-search" list="admin-sections" autoComplete="off" placeholder="Find a section" value={query} onChange={event => { setQuery(event.target.value); setSearchError(""); }} /><datalist id="admin-sections">{destinations.map(item => <option key={item.to} value={item.label} />)}</datalist><button type="submit" className="sr-only">Go to section</button></form>
          <ThemeToggle /><NotificationBell /><Link to="/settings" className="admin-avatar" aria-label="Administrator account settings">{initials}</Link>
        </div>
      </header>
      {searchError && <div className="admin-search-error" role="alert">{searchError}<button type="button" aria-label="Dismiss section search error" onClick={() => setSearchError("")}><X /></button></div>}
      {(financeSection || referralSection) && <nav className="admin-context-nav" aria-label={financeSection ? "Finance sections" : "Referral sections"}>
        {(financeSection ? [{ label: "Payment records", to: "/admin/secure-payments" }, { label: "Withdrawals", to: "/admin/withdrawals" }, { label: "Earnings records", to: "/admin?view=earnings" }] : [{ label: "Referral trees", to: "/admin?view=referrals" }, { label: "Matrix overview", to: "/admin?view=matrix" }]).map(item => <Link key={item.to} to={item.to} aria-current={location.pathname + location.search === item.to ? "page" : undefined}>{item.label}</Link>)}
      </nav>}
      <main className="admin-main">{children}</main>
    </div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className="admin-navigation-sheet"><SheetTitle className="sr-only">Admin operations</SheetTitle><SheetDescription className="sr-only">Navigate administrator reviews, records, and platform settings.</SheetDescription>{brand}{navigation}</SheetContent></Sheet>
  </div>;
}
