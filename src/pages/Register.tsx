import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmationWaiting from "@/components/auth/ConfirmationWaiting";
import { useAuth } from "@/hooks/useAuth";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol (!@#$%^&*)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const Register = () => {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
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
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    if (!acceptTerms) {
      setError("You must accept the Terms of Use and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, name, profileType, phone, refCode || undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) return <AuthLayout><ConfirmationWaiting email={email} /></AuthLayout>;

  return (
    <AuthLayout>
      <div>
        <h1 className="text-center font-display text-xl font-bold text-foreground">Create Account</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Find your place in Nigeria’s property marketplace.</p>

        {error && <div id="auth-error" role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <fieldset className="auth-role-choices"><legend>01 / Choose your account</legend>{[["buyer","Buyer / Renter"],["agent","Agent"],["builder","Builder / Developer"]].map(([value,label]) => <label className="auth-role-choice" key={value}><input type="radio" name="account-type" disabled={loading} value={value} checked={profileType===value} onChange={() => setProfileType(value)} /><span>{label}</span></label>)}</fieldset>
        <p className="auth-role-guidance">{profileType === "buyer" ? "Discover properties, save favorites on this device and request an inspection. The agent confirms availability." : profileType === "agent" ? "Create your professional profile and access the listing workspace. Identity verification is reviewed separately; registration does not verify you." : "Use the builder workspace for property listings and enquiries. Identity verification is reviewed separately; registration does not approve developments."}</p>
        <h2 className="auth-section-label">02 / Your details & account security</h2>
        <form className="mt-6 space-y-4" aria-busy={loading} aria-describedby={error ? "auth-error" : undefined} onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} id="name" autoComplete="name" placeholder="John Doe" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} id="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} id="phone" autoComplete="tel" type="tel" placeholder="+234 800 000 0000" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>


          {/* Password */}
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined}
                id="password"
                autoComplete="new-password" type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
              <Input aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined}
                id="confirmPassword"
                autoComplete="new-password" type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "Hide password confirmation" : "Show password confirmation"} aria-pressed={showConfirm} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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


          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={(v) => setAcceptTerms(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="acceptTerms" className="text-xs font-normal leading-relaxed text-muted-foreground cursor-pointer">
              I have read and accept the{" "}
              <Link to="/terms" target="_blank" className="font-medium text-secondary hover:underline">Terms of Use</Link>
              {" "}and{" "}
              <Link to="/privacy" target="_blank" className="font-medium text-secondary hover:underline">Privacy Policy</Link>.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !allRulesPassed || !passwordsMatch || !acceptTerms}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-medium text-secondary hover:underline">Log In</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
