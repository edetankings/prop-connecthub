import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOut, LayoutDashboard, ShieldCheck, Settings, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { label: "About", path: "/#about" },
  { label: "Commercial", path: "/properties?type=commercial" },
  { label: "Agents", path: "/agents" },
  { label: "How it works", path: "/#how-it-works" },
];

const Navbar = ({ overlay = false }: { overlay?: boolean }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const current = location.pathname + location.search + location.hash;
  const isActive = (path: string) => path.startsWith("/properties?")
    ? location.pathname === "/properties" && new URLSearchParams(location.search).get("type") === new URLSearchParams(path.split("?")[1]).get("type")
    : current === path;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/" || !["#about", "#how-it-works"].includes(location.hash)) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView?.({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [location.pathname, location.hash]);

  return (
    <>{location.pathname === "/" && <a href="#main-content" className="sr-only z-[100] rounded-full bg-primary px-5 py-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>}<nav data-home-section="navigation" aria-label="Main navigation"
      className={cn(
        "public-navigation top-0 z-50",
        overlay ? "fixed inset-x-0 home-navigation" : "sticky",
        overlay && !scrolled ? "is-over-hero" : "",
        scrolled ? "is-scrolled" : overlay ? "bg-transparent" : "bg-background/95"
      )}
    >
      <div className="page-container site-nav-inner">
        <Link to="/" className="site-brand flex items-center gap-2.5" aria-label="PROP-connect home">
          <img src={logo} alt="" className="h-10 w-10 rounded-xl object-contain" />
          <span className="font-display text-sm font-extrabold tracking-tight text-foreground sm:text-base">PROP-CONNECT<span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.2em] text-muted-foreground">Find your place</span></span>
        </Link>

        {!user && (
          <div className="site-nav-links">
            {publicNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (location.pathname === "/" && item.path === "/#about") document.getElementById("about")?.scrollIntoView?.({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={cn(
                  "site-nav-link",
                  isActive(item.path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="site-nav-actions">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin"><Button variant="ghost" size="sm" className="gap-1"><ShieldCheck className="h-4 w-4" /> Admin</Button></Link>
              )}
              <Link to="/messages"><Button variant="ghost" size="sm" className="gap-1"><MessageCircle className="h-4 w-4" /> Messages</Button></Link>
              <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button></Link>
              <Link to="/settings" aria-label="Settings"><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></Link>
              <span className="hidden max-w-[120px] truncate text-sm text-muted-foreground 2xl:block">{profile?.full_name || user.email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-nav-link">Log In</Link>
              <Link to="/register" className="site-nav-link">Get Started</Link>
            </>
          )}
        </div>

        <div className="site-nav-mobile">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu" aria-expanded={open}><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(90vw,24rem)] flex-col overflow-y-auto" aria-describedby={undefined}>
              <SheetTitle className="text-eyebrow">Menu</SheetTitle>
              <div className="mt-4 flex flex-col">
                {(user
                  ? [
                      { label: "Dashboard", path: "/dashboard" },
                      { label: "Messages", path: "/messages" },
                      { label: "Properties", path: "/properties" },
                      { label: "AI Assistant", path: "/ai-assistant" },
                      { label: "Settings", path: "/settings" },
                      ...(isAdmin ? [{ label: "Admin", path: "/admin" }] : []),
                    ]
                  : publicNavItems
                ).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => { setOpen(false); if (location.pathname === "/" && item.path === "/#about") document.getElementById("about")?.scrollIntoView?.({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }}
                    className="border-b border-border py-3.5 text-base font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-6">
                {user ? (
                  <Button variant="outline" onClick={() => { setOpen(false); signOut(); }} className="gap-2"><LogOut className="h-4 w-4" /> Sign out</Button>
                ) : (
                  <>
                    <Link to="/register" onClick={() => setOpen(false)}><Button className="w-full rounded-full">Get Started</Button></Link>
                    <Link to="/login" onClick={() => setOpen(false)}><Button variant="outline" className="w-full rounded-full">Log In</Button></Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav></>
  );
};

export default Navbar;
