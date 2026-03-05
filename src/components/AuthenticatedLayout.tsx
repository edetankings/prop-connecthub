import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Shield } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Prop<span className="text-secondary">Connect</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-sm text-muted-foreground hidden sm:block">
            {profile?.full_name}
          </span>
        </div>
      </header>

      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Page Content — no footer */}
      <main>{children}</main>
    </div>
  );
};

export default AuthenticatedLayout;
