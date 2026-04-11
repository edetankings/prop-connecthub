import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";
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

  useEffect(() => {
    // Check if user arrived via a recovery link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");

    if (type === "recovery") {
      setIsValidSession(true);
      return;
    }

    // Also check if there's an active session (user may already be authenticated via the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-elevated">
          <h1 className="font-display text-xl font-bold text-foreground">Invalid or Expired Link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password">
            <Button className="mt-6 w-full">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated">
        <Link to="/" className="mb-6 flex justify-center">
          <img src={logo} alt="PROP-connect" className="h-16 w-16 rounded-lg object-contain" />
        </Link>

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
              <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
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
                  <Input
                    id="confirm-password"
                    type={showConfirmPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
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
    </div>
  );
};

export default ResetPassword;
