import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOut, LayoutDashboard, ShieldCheck, Settings, MessageCircle, Search, Bot } from "lucide-react";
import logo from "@/assets/logo.jpg";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { label: "Buy", path: "/properties?type=for_sale" },
  { label: "Rent", path: "/properties?type=for_rent" },
  { label: "Land", path: "/properties?type=land" },
  { label: "Commercial", path: "/properties?type=commercial" },
  { label: "Agents", path: "/agents" },
  { label: "How It Works", path: "/#how-it-works" },
];

const Navbar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const current = location.pathname + location.search;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border bg-card/90 shadow-card backdrop-blur-md" : "border-b border-transparent bg-background"
      )}
    >
      <div className={cn("container mx-auto flex items-center justify-between gap-4 px-4 transition-all duration-300", scrolled ? "h-14" : "h-[72px]")}>
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="PROP-connect home">
          <img src={logo} alt="PROP-connect" className={cn("rounded-lg object-contain transition-all", scrolled ? "h-11 w-11" : "h-14 w-14")} />
        </Link>

        {!user && (
          <div className="hidden items-center gap-0.5 lg:flex">
            {publicNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  current === item.path ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="hidden items-center gap-1.5 lg:flex">
          <Link to="/properties" aria-label="Search properties">
            <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
          </Link>
          <Link to="/ai-assistant">
            <Button variant="ghost" size="sm" className="gap-1.5"><Bot className="h-4 w-4" /> AI Assistant</Button>
          </Link>
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin"><Button variant="ghost" size="sm" className="gap-1"><ShieldCheck className="h-4 w-4" /> Admin</Button></Link>
              )}
              <Link to="/messages"><Button variant="ghost" size="sm" className="gap-1"><MessageCircle className="h-4 w-4" /> Messages</Button></Link>
              <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button></Link>
              <Link to="/settings" aria-label="Settings"><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></Link>
              <span className="max-w-[140px] truncate text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
              <Link to="/register"><Button size="sm" className="rounded-full px-5">Get Started</Button></Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col">
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
                  : [...publicNavItems, { label: "AI Assistant", path: "/ai-assistant" }]
                ).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
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
    </nav>
  );
};

export default Navbar;
