import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const Login = () => {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for lockout
  useEffect(() => {
    const interval = setInterval(() => {
      if (lockedUntil) {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setCountdown(0);
          setError("");
        } else {
          setCountdown(remaining);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLocked) {
      setError(`Too many failed attempts. Try again in ${countdown} seconds.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      setAttempts(0);
      navigate("/dashboard");
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockedUntil(lockTime);
        setCountdown(LOCKOUT_SECONDS);
        setError(`Too many failed attempts. Account locked for ${LOCKOUT_SECONDS} seconds.`);
      } else {
        const msg = err.message?.toLowerCase() || "";
        if (msg.includes("email not confirmed")) {
          setError("Please verify your email before logging in. Check your inbox.");
        } else if (msg.includes("invalid login")) {
          setError(`Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        } else {
          setError(err.message || "Login failed");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Prop<span className="text-secondary">Connect</span></span>
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-foreground">Welcome Back</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Log in to your account</p>

        {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs font-medium text-secondary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative mt-1">
              <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || isLocked}>
            {isLocked ? `Locked (${countdown}s)` : loading ? "Logging in..." : "Log In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/register" className="font-medium text-secondary hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
