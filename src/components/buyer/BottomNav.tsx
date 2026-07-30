import { Link, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, ShieldCheck, User } from "lucide-react";

const items = [
  { to: "/dashboard/buyer", label: "Home", icon: Home },
  { to: "/properties", label: "Search", icon: Search },
  { to: "/messages", label: "Chats", icon: MessageCircle },
  { to: "/dashboard/buyer/secure-payments", label: "Payments", icon: ShieldCheck },
  { to: "/settings", label: "Profile", icon: User },
];

const BottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur-lg lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
