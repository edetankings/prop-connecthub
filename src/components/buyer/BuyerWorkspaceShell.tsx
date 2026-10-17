import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, CalendarCheck, MessageCircle, UserRound, Search, Menu, LogOut, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.jpg";

const items = [
  { label: "Overview", to: "/dashboard/buyer", icon: Home },
  { label: "Saved properties", to: "/dashboard/buyer?view=saved", icon: Heart },
  { label: "Inspections", to: "/dashboard/buyer/inspections", icon: CalendarCheck },
  { label: "Messages", to: "/messages", icon: MessageCircle },
  { label: "Transaction records", to: "/dashboard/buyer?view=transactions", icon: ReceiptText },
  { label: "Profile & settings", to: "/settings", icon: UserRound },
];
export default function BuyerWorkspaceShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
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
  const links = <><nav aria-label="Buyer workspace">{items.map(({ label, to, icon: Icon }) => {
    const destination = new URL(to, window.location.origin);
    const active = (location.pathname === destination.pathname || to === "/messages" && location.pathname.startsWith("/chat/")) && (destination.searchParams.get("view") || "overview") === (new URLSearchParams(location.search).get("view") || "overview");
    return <Link key={to} to={to} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon aria-hidden="true" />{label}</Link>;
  })}</nav><div className="buyer-nav-foot"><Link to="/properties" onClick={() => setOpen(false)}><Search />Explore properties</Link><p>Financial operations remain locked.</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={leaving} onClick={() => void logout()}><LogOut />{leaving ? "Signing out…" : "Sign out"}</button></div></>;
  return <div className="buyer-workspace"><aside className="buyer-desktop-sidebar"><Link to="/" className="buyer-brand"><img src={logo} alt="" />PROP-CONNECT</Link><p className="buyer-eyebrow">Your property workspace</p>{links}</aside><div className="buyer-workspace-body"><header className="buyer-topbar"><Button className="buyer-menu-button" variant="outline" size="icon" aria-label="Open buyer navigation" onClick={() => setOpen(true)}><Menu /></Button><Link to="/properties" className="buyer-market-link"><Search />Explore properties</Link><div><ThemeToggle /><NotificationBell /><Link to="/settings" className="buyer-account"><span aria-hidden="true">{profile?.full_name?.[0] || user?.email?.[0] || "U"}</span><span>{profile?.full_name || "Your account"}</span></Link></div></header><main className="buyer-workspace-main">{children}</main></div><Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className="buyer-navigation-sheet"><SheetTitle>Buyer workspace</SheetTitle><SheetDescription>Your properties, conversations and account.</SheetDescription>{links}</SheetContent></Sheet></div>;
}
