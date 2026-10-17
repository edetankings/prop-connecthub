import { useState } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeColors: Record<string, string> = {
  success: "text-[hsl(var(--success))]",
  error: "text-destructive",
  warning: "text-[hsl(var(--warning))]",
  info: "text-[hsl(var(--info))]",
};

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative" onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>
      <button
        aria-label="Notifications" aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div role="region" aria-label="Notifications" className="notification-panel absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-elevated z-[90]">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <p className="font-semibold text-sm text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const Icon = typeIcons[n.type] || Info;
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left p-3 border-b border-border/50 hover:bg-muted/30 transition-colors flex gap-3",
                      !n.is_read && "bg-primary/5"
                    )}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.link) navigate(n.link);
                      setOpen(false);
                    }}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", typeColors[n.type] || "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
