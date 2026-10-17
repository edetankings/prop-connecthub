import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Bed, Bath, Maximize, MessageCircle, ArrowUpRight, Heart, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";

export interface DBProperty {
  id: string;
  title: string;
  price: number;
  property_type: string;
  status: string;
  listing_type?: "sale" | "rental" | null;
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
  created_at?: string;
}

const DBPropertyCard = ({ property, layout = "grid" }: { property: DBProperty; layout?: "grid" | "list" }) => {
  const { user } = useAuth();
  const { saved, toggle } = useLocalFavorites(property.id);
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? "/placeholder.svg" : property.image_url || property.images?.[0] || "/placeholder.svg";
  const location = [property.city, property.state].filter(Boolean).join(", ") || "Location not provided";
  const isLand = property.property_type?.toLowerCase() === "land";
  const intent = property.listing_type === "rental" ? "For rent" : property.listing_type === "sale" ? "For sale" : "Listing";
  return <article className={`marketplace-card marketplace-card-${layout}`}>
    <div className="marketplace-card-image"><Link to={`/property/${property.id}`} aria-label={`View ${property.title}`}><img src={image} alt={property.title} loading="lazy" width={960} height={720} onError={() => setImageFailed(true)} /></Link>
      <div className="marketplace-card-labels"><span>{intent}</span>{property.is_verified && <span><BadgeCheck aria-hidden="true" /> Reviewed</span>}</div>
      <button type="button" className="marketplace-save" aria-pressed={saved} aria-label={saved ? `Remove ${property.title} from saved` : `Save ${property.title}`} onClick={toggle}><Heart className={saved ? "fill-current" : ""} /></button>
    </div>
    <div className="marketplace-card-copy"><p className="marketplace-card-kind">{property.property_type?.replace(/_/g," ") || "Property"}<span>{property.status?.replace(/_/g," ")}</span></p>
      <Link to={`/property/${property.id}`}><h2>{property.title}</h2></Link>
      <p className="marketplace-location"><MapPin aria-hidden="true" />{location}</p>
      <p className="marketplace-card-price">{Number.isFinite(property.price) ? `₦${property.price.toLocaleString("en-NG")}` : "Price unavailable"}</p>
      {property.listing_type === "rental" && <p className="marketplace-rental-note">Rental terms provided by the agent</p>}
      <div className="marketplace-card-facts">
        {isLand && (property.sqft ?? 0) > 0 && <span><Maximize />{property.sqft?.toLocaleString("en-NG")} sqft</span>}
        {!isLand && (property.bedrooms ?? 0) > 0 && <span><Bed />{property.bedrooms} beds</span>}
        {!isLand && (property.bathrooms ?? 0) > 0 && <span><Bath />{property.bathrooms} baths</span>}
        {!isLand && (property.sqft ?? 0) > 0 && <span><Maximize />{property.sqft?.toLocaleString("en-NG")} sqft</span>}
      </div>
      {(layout === "list" || isLand) && property.description && <p className="marketplace-card-description">{property.description}</p>}
      <div className="marketplace-card-actions"><Link to={`/property/${property.id}`}>View Property <ArrowUpRight /></Link>{user && <Button asChild variant="ghost" size="sm"><Link to={`/chat/new?agent=${property.agent_id}&property=${property.id}`}><MessageCircle />Message</Link></Button>}</div>
    </div>
  </article>;
};
export default DBPropertyCard;
