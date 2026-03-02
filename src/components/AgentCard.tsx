import { Link } from "react-router-dom";
import { ShieldCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DBAgent } from "@/pages/Agents";
import { getTrustBadge } from "@/lib/mockData";

const TrustScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--trust-high))" : score >= 50 ? "hsl(var(--trust-medium))" : "hsl(var(--trust-low))";

  return (
    <div className="relative inline-flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute font-display text-sm font-bold text-foreground">{score}</span>
    </div>
  );
};

const AgentCard = ({ agent }: { agent: DBAgent }) => {
  const badge = getTrustBadge(agent.trust_score);

  return (
    <Link to={`/agent/${agent.id}`} className="block">
      <div className="group overflow-hidden rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <img
            src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=random`}
            alt={agent.full_name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{agent.full_name}</h3>
              {agent.kyc_verified && <ShieldCheck className="h-4 w-4 text-success" />}
            </div>
            {agent.location && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" /> {agent.location}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{agent.properties_listed} listings</span>
              <span>·</span>
              <span>{agent.completed_transactions} deals</span>
            </div>
          </div>
          <TrustScoreRing score={agent.trust_score} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${
            badge.color === "trust-high" ? "border-success/30 text-success" :
            badge.color === "trust-medium" ? "border-warning/30 text-warning" :
            "border-destructive/30 text-destructive"
          }`}>
            {badge.label}
          </Badge>
        </div>
        {agent.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{agent.bio}</p>}
      </div>
    </Link>
  );
};

export { TrustScoreRing };
export default AgentCard;
