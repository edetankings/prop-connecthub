import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_SETTINGS_CHANGED = "subscription-settings-changed";

export function useSubscriptionSettings(active = true) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(active);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const requestVersion = useRef(0);
  const lastEnabled = useRef<boolean | null>(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const confirm = useCallback((value: boolean) => {
    // A read started before this save must not overwrite its acknowledged value.
    requestVersion.current += 1;
    lastEnabled.current = value;
    setEnabled(value);
    setError(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!active) { lastEnabled.current = null; setEnabled(null); setLoading(false); return; }
    let current = true;
    const version = ++requestVersion.current;
    setLoading(lastEnabled.current === null);
    setError(false);
    void (async () => {
      try {
        const result = await supabase.rpc("get_subscriptions_enabled");
        if (result.error || typeof result.data !== "boolean") throw new Error("Setting unavailable");
        if (current && requestVersion.current === version) { lastEnabled.current = result.data; setEnabled(result.data); }
      } catch {
        if (current && requestVersion.current === version) setError(true);
      } finally {
        if (current && requestVersion.current === version) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, [active, revision]);

  useEffect(() => {
    if (!active) return;
    const onChange = (event: Event) => {
      const value: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof value === "boolean") confirm(value);
      else refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener(SUBSCRIPTION_SETTINGS_CHANGED, onChange);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(SUBSCRIPTION_SETTINGS_CHANGED, onChange);
    };
  }, [active, refresh, confirm]);

  return { enabled, loading, error, refresh, confirm };
}
