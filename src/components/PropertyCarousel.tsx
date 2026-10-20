import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { BadgeCheck, Heart, MapPin, BedDouble, Bath, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocalFavorites } from "@/hooks/useLocalFavorites";
import type { DBProperty } from "@/components/DBPropertyCard";

gsap.registerPlugin(ScrollTrigger);

const typeLabel = (p: DBProperty) =>
  (p.property_type || "Property").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CarouselCard = ({ p }: { p: DBProperty }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const { saved, toggle } = useLocalFavorites(p.id);
  const img = p.image_url || p.images?.[0] || "/placeholder.svg";
  const loc = [p.city, p.state].filter(Boolean).join(", ") || "Nigeria";
  const isRent = p.listing_type === "rental";


  return (
    <article
      className="premium-property-card group relative block shrink-0 snap-start overflow-hidden border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-card"
    >
      <Link to={`/property/${p.id}`} className="block">
      <div className="property-card-image relative aspect-[4/3] overflow-hidden">
        <img
          src={imageFailed ? "/placeholder.svg" : img}
          onError={() => setImageFailed(true)}
          width={960} height={720}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="property-card-badges">
          {p.is_verified && (
            <Badge className="gap-1 bg-secondary text-secondary-foreground">
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
          <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-md">
            {isRent ? "For Rent" : "For Sale"}
          </Badge>
        </div>

        <p className="property-card-category">
          {typeLabel(p)}
        </p>
      </div>
      <div className="property-card-body">
        <h3 className="property-card-title font-display font-semibold text-foreground">{p.title}</h3>
        <p className="property-card-location text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" /> {loc}
        </p>
        <p className="property-card-price font-display font-bold text-primary">
          ₦{p.price?.toLocaleString("en-NG")}
          {isRent && <span className="text-xs font-normal text-muted-foreground"> Rental</span>}
        </p>
        <div className="property-card-facts">
          {p.bedrooms != null && p.bedrooms > 0 && <span><BedDouble aria-hidden="true" /> {p.bedrooms} <span className="sr-only">bedrooms</span></span>}
          {p.bathrooms != null && p.bathrooms > 0 && <span><Bath aria-hidden="true" /> {p.bathrooms} <span className="sr-only">bathrooms</span></span>}
          {p.sqft != null && p.sqft > 0 && <span><Maximize aria-hidden="true" /> {p.sqft.toLocaleString()} sqft</span>}
        </div>
        <span className="property-card-action">
          View Property
        </span>
      </div>
      </Link>
        <button
          type="button"
          onClick={event => { event.preventDefault(); event.stopPropagation(); toggle(); }}
          aria-label={saved ? `Remove ${p.title} from saved` : `Save ${p.title}`}
          aria-pressed={saved}
          className="property-card-save"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} />
        </button>
    </article>
  );
};

const PropertyCarousel = ({ properties, responsiveGrid = false }: { properties: DBProperty[]; responsiveGrid?: boolean }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    if (trackRef.current) observer?.observe(trackRef.current);
    window.addEventListener("resize", sync);
    return () => { observer?.disconnect(); window.removeEventListener("resize", sync); };
  }, [sync, properties.length]);

  useEffect(() => {
    if (!responsiveGrid || !properties.length) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.from(".premium-property-card", { opacity: .8, y: 12, duration: .5, stagger: .06,
          clearProps: "opacity,transform", scrollTrigger: { trigger: trackRef.current, start: "top 95%", once: true } });
      }, trackRef);
      return () => context.revert();
    });
    return () => media.revert();
  }, [responsiveGrid, properties.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  if (properties.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">No properties yet. Check back soon.</p>;
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={sync}
        className={`property-track ${responsiveGrid ? "responsive-property-grid" : "property-swipe-track"}`}
      >
        {properties.map((p) => (
          <CarouselCard key={p.id} p={p} />
        ))}
      </div>

      <div className={`property-track-controls ${responsiveGrid ? "property-grid-controls" : ""}`}>
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous properties"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          className="h-11 min-w-20 w-auto rounded-full px-3"
        >
          <span className="navigation-control-label">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next properties"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          className="h-11 min-w-20 w-auto rounded-full px-3"
        >
          <span className="navigation-control-label">Next</span>
        </Button>
      </div>
    </div>
  );
};

export default PropertyCarousel;
