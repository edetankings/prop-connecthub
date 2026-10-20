import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useKYCVerification } from "@/hooks/useKYCVerification";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import KYCSubmissionForm from "@/components/KYCSubmissionForm";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Badge } from "@/components/ui/badge";

const IdentityVerification = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isVerified } = useKYCVerification();

  const userId = user?.id;
  const userCode = userId ? `PC-${userId.slice(0, 5).toUpperCase()}` : "PC-00000";

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
           Back
        </Button>

        {/* Profile Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground truncate">{profile?.full_name || "User"}</h1>
                {(isVerified || profile?.kyc_verified) && <VerifiedBadge size="sm" showLabel={false} />}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{profile?.profile_type?.toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{userCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agent/Builder Notice */}
        {(profile?.profile_type === "agent" || profile?.profile_type === "builder") && !isVerified && !profile?.kyc_verified && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-6 flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Important:</span> Full verification is required to publish properties, receive escrow payouts, and build buyer trust.
            </p>
          </div>
        )}

        {/* Single KYC Form */}
        <KYCSubmissionForm />
      </div>
    </AuthenticatedLayout>
  );
};

export default IdentityVerification;
