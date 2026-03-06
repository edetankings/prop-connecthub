import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Home, Search, Heart, MessageCircle, Receipt, User, Settings, HelpCircle, LogOut,
  LayoutDashboard, Building, Plus, Wallet, ShieldCheck, Star, X,
  Users, FileCheck, CheckCircle, TrendingUp, FileText, BarChart3, Cog, AlertTriangle, ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const buyerMenu = [
  { label: "Dashboard", icon: Home, to: "/dashboard/buyer" },
  { label: "Find Properties", icon: Search, to: "/properties" },
  { label: "Messages", icon: MessageCircle, to: "/messages", badge: true },
  { label: "Verification", icon: ShieldCheck, to: "/verification" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const agentMenu = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard/agent" },
  { label: "Add Property", icon: Plus, to: "/add-property" },
  { label: "My Listings", icon: Building, to: "/dashboard/agent" },
  { label: "Messages", icon: MessageCircle, to: "/messages", badge: true },
  { label: "Verification", icon: ShieldCheck, to: "/verification" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const adminMenu = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  { label: "All Users", icon: Users, to: "/admin" },
  { label: "Verification Requests", icon: ShieldCheck, to: "/admin" },
  { label: "Pending Properties", icon: FileCheck, to: "/admin", badge: true },
  { label: "Messages", icon: MessageCircle, to: "/messages", badge: true },
  { label: "Settings", icon: Cog, to: "/settings" },
];

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingProperties, setPendingProperties] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnread = async () => {
      const { data: threads } = await supabase
        .from("chat_threads")
        .select("id")
        .or(`buyer_id.eq.${profile.id},agent_id.eq.${profile.id}`);

      if (threads && threads.length > 0) {
        const threadIds = threads.map((t) => t.id);
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("thread_id", threadIds)
          .neq("sender_id", profile.id)
          .eq("seen", false);
        setUnreadCount(count || 0);
      }
    };

    fetchUnread();

    // Realtime subscription for new messages
    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Fetch pending properties for admin badge
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "under_verification")
      .then(({ count }) => setPendingProperties(count || 0));
  }, [isAdmin]);

  const menu = isAdmin ? adminMenu : profile?.profile_type === "agent" ? agentMenu : buyerMenu;

  const roleLabel = isAdmin ? "Admin" : profile?.profile_type === "agent" ? "Agent" : "Buyer";

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate("/login");
  };

  const getBadgeCount = (item: typeof menu[0]) => {
    if (item.label === "Messages") return unreadCount;
    if (item.label === "Pending Properties") return pendingProperties;
    return 0;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full w-[280px] flex flex-col transition-transform duration-300 ease-in-out",
          "bg-sidebar text-sidebar-foreground shadow-elevated",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Profile Section */}
        <div className="px-5 pt-6 pb-4 border-b border-sidebar-border">
          <Link to="/settings" onClick={onClose}>
            <Avatar className="h-16 w-16 border-2 border-sidebar-primary mb-3">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-bold text-lg">
                {(profile?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <p className="font-display font-bold text-sidebar-accent-foreground text-lg leading-tight">
            {profile?.full_name || user?.email?.split("@")[0] || "User"}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold px-2 py-0.5 border-0">
              {roleLabel}
            </Badge>
            {profile?.kyc_verified && (
              <span className="flex items-center gap-0.5 text-xs text-sidebar-primary font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {menu.map((item) => {
            const isActive = location.pathname === item.to;
            const badgeCount = item.badge ? getBadgeCount(item) : 0;

            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  "active:scale-[0.97]",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={cn(
                    "h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                    isActive
                      ? "bg-sidebar-primary-foreground text-sidebar-primary"
                      : "bg-sidebar-primary text-sidebar-primary-foreground"
                  )}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.97]"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
