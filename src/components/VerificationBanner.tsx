import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKYCVerification } from "@/hooks/useKYCVerification";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const VerificationBanner = () => {
  const { profile } = useAuth();
  const { kycStatus, loading } = useKYCVerification();

  if (!profile || loading) return null;
  const verified = profile.kyc_verified || kycStatus === "verified";
  const pending = kycStatus === "pending";
  const rejected = kycStatus === "rejected";

  return (
    <div className="px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/[0.07] p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--warning))]/15">
            <ShieldAlert className="h-5 w-5 text-[hsl(var(--warning))]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{verified ? "Identity verified" : pending ? "Identity verification under review" : rejected ? "Verification needs your attention" : "Complete identity verification"}</p>
            <p className="text-xs text-muted-foreground">
              {verified ? "Your identity review is complete. Existing permissions still apply." : pending ? "Your submitted identity documents are awaiting review. No approval is implied." : rejected ? "Review the feedback on your verification page before submitting again." : "Review the required identity documents. Registration does not grant verification."} Financial operations remain locked.
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0 rounded-full px-5" asChild>
          <Link to="/verification">{verified || pending ? "View verification" : rejected ? "Review feedback" : "View requirements"}</Link>
        </Button>
      </div>
    </div>
  );
};

export default VerificationBanner;
