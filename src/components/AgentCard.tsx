import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, UserRound, Heart, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DBAgent } from "@/pages/Agents";
import { getTrustBadge } from "@/lib/presentation";
import { useAuth } from "@/hooks/useAuth";
import VerifiedBadge from "@/components/VerifiedBadge";

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

const AgentCard = ({ agent, editorial = false, profession = "Agent", marketplace = false }: { agent: DBAgent; editorial?: boolean; profession?: string; marketplace?: boolean }) => {
  const [saved,setSaved] = useState(false);
  const badge = getTrustBadge(agent.trust_score);
  const { user, profile } = useAuth();
  const showChat = user && profile && profile.id !== agent.id;

  if (marketplace) return <article className="agent-market-card"><div className="agent-market-portrait">{agent.avatar_url ? <img src={agent.avatar_url} alt={agent.full_name} loading="lazy" /> : <div className="agent-live-photo-placeholder"><UserRound aria-label="Profile photo not supplied" /></div>}<span className="agent-preview-label">{agent.kyc_verified?"Verified agent":"Verification pending"}</span><button type="button" aria-label={`Save ${agent.full_name}`} aria-pressed={saved} onClick={()=>setSaved(value=>!value)}><Heart fill={saved?"currentColor":"none"} /></button></div><div className="agent-market-card-copy"><h3>{agent.full_name}</h3><p><Building2 />Property professional</p>{agent.location && <p><MapPin />{agent.location}</p>}<div className="agent-card-metrics"><span><b>{agent.properties_listed}</b>Listings</span><span><b>{agent.completed_transactions}</b>Deals</span><span><b>{agent.trust_score}</b>Trust score</span></div><Link className="agent-primary" to={`/agent/${agent.id}`}>View profile </Link>{showChat && <Link className="agent-secondary mt-2 w-full" to={`/chat/new?agent=${agent.id}`}><MessageCircle />Contact</Link>}</div></article>;

  if (editorial) return <article className="home-professional-card">
    <div className="home-professional-top"><span>{profession}</span>{agent.kyc_verified && <VerifiedBadge size="sm" />}</div>
    <Link to={`/agent/${agent.id}`} className="home-professional-profile">
      {agent.avatar_url ? <img src={agent.avatar_url} alt={agent.full_name} loading="lazy" /> : <div className="home-professional-avatar" aria-hidden="true"><UserRound /></div>}
      <h3>{agent.full_name}</h3>{agent.location && <p><MapPin /> {agent.location}</p>}
      {agent.bio && <p className="home-professional-bio">{agent.bio}</p>}
      <span className="home-professional-link">Meet {agent.full_name.split(" ")[0]} </span>
    </Link>
    {showChat && <Button asChild variant="outline" className="mt-4 w-full"><Link to={`/chat/new?agent=${agent.id}`}><MessageCircle /> Start a conversation</Link></Button>}
  </article>;

  return (
    <div className="agent-standard-card group overflow-hidden rounded-lg border border-border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
      <Link to={`/agent/${agent.id}`} className="block">
        <div className="flex items-start gap-4">
          <img
            src={agent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.full_name)}&background=random`}
            alt={agent.full_name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{agent.full_name}</h3>
              {agent.kyc_verified ? (
                <VerifiedBadge size="sm" />
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5">Pending</Badge>
              )}
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
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            {badge.label}
          </Badge>
        </div>
        {agent.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{agent.bio}</p>}
      </Link>
      {showChat && (
        <div className="mt-3 border-t border-border pt-3">
          <Link to={`/chat/new?agent=${agent.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <MessageCircle className="h-4 w-4" /> Chat with Agent
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export { TrustScoreRing };
export default AgentCard;
