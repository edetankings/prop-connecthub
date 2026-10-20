import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const submitLock = useRef(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || sent) return;
    setError("");

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error || (err && typeof err === "object" && "message" in err) ? String(err.message) : "Something went wrong. Please try again.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div>
{sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Check Your Email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account is eligible for recovery, a reset link has been requested for <strong className="text-foreground">{email}</strong>.
              Please check your inbox and click the link to reset your password.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => { setSent(false); setError(""); }}>
              Try Another Email
            </Button>
            <Link to="/login" className="mt-3 inline-block text-sm font-medium text-secondary hover:underline">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center font-display text-xl font-bold text-foreground">Reset Your Password</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Enter your email address and we will send you a link to reset your password.
            </p>

            {error && (
              <div id="auth-error" role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <form className="mt-6 space-y-4" aria-busy={loading} aria-describedby={error ? "auth-error" : undefined} onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined}
                  id="email"
                  type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                  placeholder="you@example.com"
                  className="mt-1"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-secondary hover:underline"
            >
               Back to Login
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
