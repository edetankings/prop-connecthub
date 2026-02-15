import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/lib/mockData";
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

const AgentCard = ({ agent }: { agent: Agent }) => {
  const badge = getTrustBadge(agent.trustScore);

  return (
    <Link to={`/agent/${agent.id}`} className="block">
      <div className="group overflow-hidden rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <img src={agent.avatar} alt={agent.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-border" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{agent.name}</h3>
              {agent.verificationLevel !== "unverified" && (
                <ShieldCheck className="h-4 w-4 text-success" />
              )}
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" /> {agent.location}
            </p>
            <div className="mt-1 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
              <span className="text-sm font-medium text-foreground">{agent.rating}</span>
              <span className="text-xs text-muted-foreground">({agent.reviewCount} reviews)</span>
            </div>
          </div>
          <TrustScoreRing score={agent.trustScore} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${
            badge.color === "trust-high" ? "border-success/30 text-success" :
            badge.color === "trust-medium" ? "border-warning/30 text-warning" :
            "border-destructive/30 text-destructive"
          }`}>
            {badge.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{agent.specialization}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{agent.bio}</p>
      </div>
    </Link>
  );
};

export { TrustScoreRing };
export default AgentCard;
