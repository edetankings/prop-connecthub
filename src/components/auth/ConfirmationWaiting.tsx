import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function ConfirmationWaiting({ email, compact = false }: { email: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const resend = async () => {
    if (pending.current || seconds) return;
    pending.current = true; setBusy(true); setMessage(""); setFailed(false);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      setMessage("If confirmation is required for this address, a new link has been requested. Check your inbox and spam folder.");
      setSeconds(60);
    } catch { setFailed(true); setMessage("We could not request another link. Please try again later."); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="auth-confirmation">{!compact && <><div className="auth-state-icon"><Mail aria-hidden="true" /></div><p className="auth-eyebrow">One more step</p><h1>Check Your Email</h1><p>If your account needs confirmation, follow the verification link sent to <strong>{email}</strong>, then return to sign in. A request does not confirm delivery or verify your account.</p><p>Check your spam folder, too. Your chosen account type does not grant professional verification.</p></>}{message && <p role={failed ? "alert" : "status"}>{message}</p>}<Button variant="outline" disabled={busy || seconds > 0} onClick={() => void resend()}>{busy ? "Requesting link…" : seconds ? `Resend available in ${seconds}s` : "Resend confirmation email"}</Button>{!compact && <Button asChild><Link to="/login">Go to Login</Link></Button>}</section>;
}
