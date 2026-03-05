import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const items = (data as Notification[]) || [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.is_read).length);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, user]);

  const markAsRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    await fetchNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    await fetchNotifications();
  };

  return { notifications, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications };
}

// Helper to create a notification (call from admin actions)
export async function createNotification(userId: string, title: string, message: string, type: string = "info", link?: string) {
  await (supabase as any).from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link,
  });
}
