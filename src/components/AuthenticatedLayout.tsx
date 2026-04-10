import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import VerificationBanner from "@/components/VerificationBanner";
import logo from "@/assets/logo.jpg";

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
            <img src={logo} alt="PROP-connect" className="h-9 w-9 rounded-lg object-cover" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <span className="text-sm text-muted-foreground hidden sm:block">
            {profile?.full_name}
          </span>
        </div>
      </header>

      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Verification Banner */}
      <VerificationBanner />

      {/* Page Content — no footer */}
      <main>{children}</main>
    </div>
  );
};

export default AuthenticatedLayout;
