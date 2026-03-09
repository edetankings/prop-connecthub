import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const Register = () => {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileType, setProfileType] = useState("buyer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const allRulesPassed = passwordRules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRulesPassed) {
      setError("Please make sure your password meets all requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, profileType, phone);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--success)/0.1)]">
            <Shield className="h-8 w-8 text-[hsl(var(--success))]" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Check Your Email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a verification link to <strong>{email}</strong>. Click the link in your email to verify your account, then come back to log in.
          </p>
          <Link to="/login">
            <Button className="mt-6 w-full">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Prop<span className="text-secondary">Connect</span></span>
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-foreground">Create Account</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Join Nigeria's most trusted property marketplace</p>

        {error && <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Doe" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+234 800 000 0000" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Account Type</Label>
            <Select value={profileType} onValueChange={setProfileType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="builder">Builder/Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password strength rules */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <div key={rule.label} className="flex items-center gap-1.5">
                      {passed
                        ? <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                        : <XCircle className="h-3.5 w-3.5 text-destructive" />
                      }
                      <span className={`text-xs ${passed ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                {passwordsMatch
                  ? <><CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" /><span className="text-xs text-[hsl(var(--success))]">Passwords match</span></>
                  : <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">Passwords do not match</span></>
                }
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !allRulesPassed || !passwordsMatch}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-secondary hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
