import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, CalendarCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ChatProperty {
  id: string;
  title: string;
  city?: string | null;
  state?: string | null;
  price?: number | null;
  image_url?: string | null;
  property_code?: string | null;
  status?: string | null;
}

interface Props {
  property: ChatProperty;
  compact?: boolean;
  isBuyer?: boolean;
  onReserve?: () => void;
}

export function ChatPropertyCard({ property, compact, isBuyer, onReserve }: Props) {
  const location = [property.city, property.state].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 p-3">
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {property.image_url ? (
            <img src={property.image_url} alt={property.title} loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{property.title}</p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" /> {location}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-primary">₦{(property.price || 0).toLocaleString()}</span>
            {property.property_code && (
              <Badge variant="outline" className="font-mono text-[10px]">{property.property_code}</Badge>
            )}
            {property.status && (
              <Badge variant="secondary" className="text-[10px] capitalize">{property.status.replace(/_/g, " ")}</Badge>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="hidden shrink-0 rounded-full sm:inline-flex">
          <Link to={`/property/${property.id}`}>View Property</Link>
        </Button>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2 border-t border-border/70 bg-muted/30 p-3">
          <Button asChild size="sm" variant="outline" className="rounded-full sm:hidden">
            <Link to={`/property/${property.id}`}>
              View Property
            </Link>
          </Button>
          {isBuyer && (
            <>
              <Button size="sm" variant="outline" className="rounded-full gap-1.5" onClick={onReserve}>
                <CalendarCheck className="h-3.5 w-3.5" /> Reserve
              </Button>
              <Button size="sm" disabled className="rounded-full gap-1.5" aria-label="Financial operations locked"><Lock className="h-3.5 w-3.5" /> Financial operations locked</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
