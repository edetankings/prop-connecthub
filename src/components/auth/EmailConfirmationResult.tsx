import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Observe the existing callback; never exchange tokens or change redirects here. */
export default function EmailConfirmationResult() {
  const [intent] = useState(() => {
    if (!["/", "/login"].includes(window.location.pathname)) return "none";
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.has("error") || query.has("error") || hash.has("error_code") || query.has("error_code")) return "invalid";
    return (hash.get("type") || query.get("type")) === "signup" ? "signup" : "none";
  });
  const [status, setStatus] = useState<"checking" | "verified" | "unconfirmed">("checking");
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (intent !== "signup") return;
    let active = true;
    let revision = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const check = async () => {
      const current = ++revision;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (active && current === revision) setStatus(!error && data.user?.email_confirmed_at ? "verified" : "unconfirmed");
      } catch { if (active && current === revision) setStatus("unconfirmed"); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Defer Auth requests outside the SDK callback lock.
      const timer = setTimeout(() => { timers.delete(timer); if (active) void check(); }, 0);
      timers.add(timer);
    });
    void check();
    return () => { active = false; timers.forEach(clearTimeout); subscription.unsubscribe(); };
  }, [intent]);
  if (intent === "none" || dismissed) return null;
  const invalid = intent === "invalid";
  return <section className="auth-email-result" aria-label="Email confirmation" role={invalid ? "alert" : "status"}><div><h2>{invalid ? "Confirmation link unavailable" : status === "verified" ? "Signed-in email verified" : status === "checking" ? "Checking your confirmation…" : "Confirmation could not be verified"}</h2><p>{invalid ? "This link may be invalid or expired. Return to sign in to check your account, or request another confirmation email." : status === "verified" ? "Supabase confirms that the signed-in account has a verified email. Professional identity verification remains separate." : "We only show confirmation after Auth verifies your email. If necessary, return to sign in or request another link."}</p><Link to="/login">Go to sign in</Link>{status === "verified" && !invalid && <Link to="/dashboard">Continue to your account</Link>}</div><button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss confirmation message">Dismiss</button></section>;
}
