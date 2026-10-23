import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function GoogleSignIn({ consent, disabled = false }: { consent: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    if (!consent || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch {
      setError("Google sign-in is unavailable. Please use email sign-in or try again later.");
      setBusy(false);
    }
  };
  return <div className="mt-4 space-y-2">
    <Button type="button" variant="outline" className="w-full" disabled={!consent || disabled || busy} onClick={() => void signIn()}>
      {busy ? "Connecting to Google…" : "Continue with Google"}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
