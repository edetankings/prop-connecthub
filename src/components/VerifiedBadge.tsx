import { ShieldCheck, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const VerifiedBadge = ({
  size = "md",
  showLabel = true,
  className = "",
}: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const badgeSizes = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ShieldCheck
              className={`${sizeClasses[size]} text-[hsl(var(--success))] ${className}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>KYC Verified Account</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge
      className={`bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 gap-1 ${badgeSizes[size]} ${className}`}
    >
      <CheckCircle className={sizeClasses[size]} />
      Verified
    </Badge>
  );
};

export default VerifiedBadge;
