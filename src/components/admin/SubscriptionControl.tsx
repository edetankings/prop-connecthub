import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { SUBSCRIPTION_SETTINGS_CHANGED, useSubscriptionSettings } from "@/hooks/useSubscriptionSettings";

export default function SubscriptionControl({ compact = false }: { compact?: boolean }) {
  const settings = useSubscriptionSettings();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const locked = useRef(false);

  const change = async (enabled: boolean) => {
    if (locked.current || settings.loading || settings.enabled === null) return;
    locked.current = true;
    setSaving(true);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("set_subscriptions_enabled", { _enabled: enabled });
      if (error) throw error;
      if (data !== enabled) throw new Error("The server did not confirm the change. Refresh the setting before retrying.");
      settings.confirm(data);
      setNotice(`Subscriptions ${enabled ? "ON" : "OFF"}. Setting saved.`);
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_SETTINGS_CHANGED, { detail: data }));
    } catch (error: unknown) {
      const details = error && typeof error === "object" ? error as { code?: string; message?: string } : null;
      const explanation = details?.code === "42501"
        ? "Your current account does not have permission. Sign in again with the administrator account."
        : details?.code === "PGRST202"
          ? "This server cannot find the subscription save endpoint. Check the connected Supabase project and refresh its API schema."
          : details?.code === "PGRST301" || details?.code === "PGRST303"
            ? "Your session has expired. Sign in again and retry."
            : details?.message || "Check your connection and retry.";
      setNotice(`Could not save the subscription setting. ${explanation}`);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };

  return <div className="admin-subscription-control">
    <div className="feature-default-control">
      <div><label htmlFor="subscriptions-default">{compact ? "Subscription requirement" : "Subscriptions ON / OFF"}</label>
        <p id="subscriptions-default-help">{compact ? (settings.enabled === false ? "Verified agents and builders can list without subscribing." : "Verified agents and builders need an active subscription to list.") : "ON requires an active subscription to submit listings. OFF lets verified agents and builders submit listings without subscribing. Existing subscriptions are preserved."}</p>
      </div>
      <Switch id="subscriptions-default" checked={settings.enabled === true} disabled={settings.loading || saving || settings.enabled === null} onCheckedChange={change} aria-describedby="subscriptions-default-help" />
    </div>
    {settings.loading && <p role="status">Loading subscription setting…</p>}
    {saving && <p role="status">Saving subscription setting…</p>}
    {settings.error && <div role="alert"><p>{settings.enabled === null ? "Subscription settings could not be loaded. Check that the subscription control database update is installed." : "Could not refresh the subscription setting. Showing the last confirmed value."}</p><button type="button" className="feature-management-link" onClick={settings.refresh}>Retry subscription setting</button></div>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
