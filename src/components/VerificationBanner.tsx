import { AlertTriangle } from "lucide-react";
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
    <div className="bg-[hsl(var(--warning))]/10 border-b border-[hsl(var(--warning))]/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0" />
        <span className="text-[hsl(var(--warning))] font-medium">
          Complete your identity verification to unlock all features.
        </span>
      </div>
      <Button size="sm" variant="outline" className="border-[hsl(var(--warning))] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/10 shrink-0" asChild>
        <Link to="/identity-verification">Verify Now</Link>
      </Button>
    </div>
  );
};

export default VerificationBanner;
