import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  screenshot_url: string;
  note: string | null;
  status: string;
  created_at: string;
}

export const useSubscription = () => {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pendingRequest, setPendingRequest] = useState<SubscriptionRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const isAgent = profile?.profile_type === "agent";

  const fetchData = useCallback(async () => {
    if (!user?.id || !isAgent) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [subRes, reqRes] = await Promise.all([
      (supabase as any).from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("subscription_requests").select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const sub = subRes.data as Subscription | null;
    // Auto-expire check
    if (sub && sub.status === "active" && new Date(sub.end_date) < new Date()) {
      sub.status = "expired";
    }
    setSubscription(sub);
    setPendingRequest(reqRes.data as SubscriptionRequest | null);
    setLoading(false);
  }, [user?.id, isAgent]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isActive = subscription?.status === "active" && new Date(subscription.end_date) >= new Date();

  const daysRemaining = subscription && isActive
    ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000))
    : 0;

  return { subscription, pendingRequest, loading, isActive, daysRemaining, isAgent, refetch: fetchData };
};
