import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKYCVerification } from "@/hooks/useKYCVerification";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const VerificationBanner = () => {
  const { profile } = useAuth();
  const { kycStatus } = useKYCVerification();

  // Hide if verified or KYC submission is pending review
  if (!profile || profile.kyc_verified || kycStatus === "pending" || kycStatus === "verified") return null;

  return (
    <div className="px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/[0.07] p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--warning))]/15">
            <ShieldAlert className="h-5 w-5 text-[hsl(var(--warning))]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Complete Identity Verification</p>
            <p className="text-xs text-muted-foreground">
              Unlock secure payments, reservations and verified agents.
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0 rounded-full px-5" asChild>
          <Link to="/verification">Verify Now</Link>
        </Button>
      </div>
    </div>
  );
};

export default VerificationBanner;
