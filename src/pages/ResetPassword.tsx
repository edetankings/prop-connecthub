import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const submitLock = useRef(false);
  const sessionValid = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const linkParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const linkError = linkParams.has("error") || linkParams.has("error_code") || queryParams.has("error") || queryParams.has("error_code");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session && !linkError) {
        revision++;
        sessionValid.current = true;
        setIsValidSession(true);
      } else if (event === "SIGNED_OUT" || !session) {
        revision++;
        sessionValid.current = false;
        setIsValidSession(false);
      }
    });
    // URL processing may finish before this page subscribes. Validate the SDK session
    // with Auth rather than trusting a fragment or requiring an event we may have missed.
    const initialRevision = revision;
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const identity = session && !error && !linkError ? await supabase.auth.getUser() : null;
        if (!active || revision !== initialRevision) return;
        const valid = !!session && !!identity?.data.user && !identity.error && identity.data.user.id === session.user.id;
        sessionValid.current = valid;
        setIsValidSession(valid);
      } catch {
        if (active && revision === initialRevision) { sessionValid.current = false; setIsValidSession(false); }
      }
    })();
    return () => {
      active = false;
      sessionValid.current = false;
      subscription.unsubscribe();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || success) return;
    if (!isValidSession || !sessionValid.current) { setError("Please request a valid recovery link."); return; }
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      if (!data.user) throw new Error("Password update was not confirmed. Please try again.");
      if (!sessionValid.current) return;
      setSuccess(true);
      redirectTimer.current = setTimeout(() => navigate("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error || (err && typeof err === "object" && "message" in err) ? String(err.message) : "Failed to update password.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <AuthLayout><div role="status">
        <p className="text-muted-foreground">Verifying reset link...</p>
      </div></AuthLayout>
    );
  }

  if (isValidSession === false) {
    return (
      <AuthLayout>
        <div className="auth-confirmation">
          <h1 className="font-display text-xl font-bold text-foreground">Invalid or Expired Link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="mt-6 w-full">Request New Link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div>
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Password Updated!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been successfully updated. Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center font-display text-xl font-bold text-foreground">Create New Password</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Enter your new password below.
            </p>

            {error && (
              <div id="auth-error" role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <form className="mt-6 space-y-4" aria-busy={loading} aria-describedby={error ? "auth-error" : undefined} onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1">
                  <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined}
                    id="password"
                    autoComplete="new-password" type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide new password" : "Show new password"} aria-pressed={showPw} onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined}
                    id="confirm-password"
                    autoComplete="new-password" type={showConfirmPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPw ? "Hide password confirmation" : "Show password confirmation"} aria-pressed={showConfirmPw} onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
