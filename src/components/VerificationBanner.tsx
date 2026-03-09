import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const VerificationBanner = () => {
  const { profile } = useAuth();

  if (!profile || profile.kyc_verified) return null;

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span className="text-warning font-medium">
          Account not verified — complete verification to unlock all features.
        </span>
      </div>
      <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10 shrink-0" asChild>
        <Link to="/identity-verification">Verify Now</Link>
      </Button>
    </div>
  );
};

export default VerificationBanner;
