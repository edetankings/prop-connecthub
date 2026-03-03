import { Link } from "react-router-dom";
import { MapPin, Bed, Bath, Maximize, MessageCircle, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export interface DBProperty {
  id: string;
  title: string;
  price: number;
  property_type: string;
  status: string;
  image_url: string | null;
  images: string[] | null;
  city: string | null;
  state: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  agent_id: string;
  description: string | null;
  is_verified: boolean;
}

const DBPropertyCard = ({ property }: { property: DBProperty }) => {
  const { user } = useAuth();
  const displayImage = property.image_url || property.images?.[0] || "/placeholder.svg";
  const location = [property.city, property.state].filter(Boolean).join(", ") || "Nigeria";
  const isSale = property.status === "for_sale" || property.status === "available";

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
      <div className="relative overflow-hidden">
        <img
          src={displayImage}
          alt={property.title}
          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge className={isSale ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
            {isSale ? "For Sale" : "For Rent"}
          </Badge>
          {property.is_verified && (
            <Badge className="bg-success/90 text-success-foreground">Verified</Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="rounded-md bg-card/90 px-3 py-1 font-display text-lg font-bold text-foreground backdrop-blur-sm">
            ₦{property.price.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="p-4">
        <Link to={`/property/${property.id}`}>
          <h3 className="font-display text-lg font-semibold text-foreground transition-colors hover:text-secondary">
            {property.title}
          </h3>
        </Link>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {location}
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          {(property.bedrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {property.bedrooms}</span>
          )}
          {(property.bathrooms ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.bathrooms}</span>
          )}
          {(property.sqft ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {property.sqft} sqft</span>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {user && (
            <Link to={`/chat/new?agent=${property.agent_id}&property=${property.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
                <MessageCircle className="h-4 w-4" /> Chat
              </Button>
            </Link>
          )}
          <Link to={`/property/${property.id}`} className="flex-1">
            <Button size="sm" className="w-full gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <CalendarCheck className="h-4 w-4" /> View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DBPropertyCard;
