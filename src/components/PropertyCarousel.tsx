import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DBProperty } from "@/components/DBPropertyCard";

const FAV_KEY = "prop-connect-favorites";

const readFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const typeLabel = (p: DBProperty) =>
  (p.property_type || "Property").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CarouselCard = ({ p }: { p: DBProperty }) => {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const saved = favorites.includes(p.id);
  const img = p.image_url || p.images?.[0] || "/placeholder.svg";
  const loc = [p.city, p.state].filter(Boolean).join(", ") || "Nigeria";
  const isRent = p.status === "for_rent";

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = saved ? favorites.filter((id) => id !== p.id) : [...favorites, p.id];
    setFavorites(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <Link
      to={`/property/${p.id}`}
      className="group relative block w-[78vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-elevated sm:w-[46%] md:w-[31%] lg:w-[23%] xl:w-[calc((100%-5rem)/6)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {p.is_verified && (
            <Badge className="gap-1 bg-secondary text-secondary-foreground">
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
          <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-md">
            {isRent ? "For Rent" : "For Sale"}
          </Badge>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={saved ? `Remove ${p.title} from saved` : `Save ${p.title}`}
          aria-pressed={saved}
          className="absolute right-2.5 top-2.5 rounded-full bg-card/85 p-2 text-foreground backdrop-blur transition-colors hover:bg-card"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} />
        </button>
        <p className="absolute bottom-2.5 left-3 text-[10px] uppercase tracking-[0.2em] text-white/85">
          {typeLabel(p)}
        </p>
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" /> {loc}
        </p>
        <p className="mt-2.5 font-display text-lg font-bold text-primary">
          ₦{p.price?.toLocaleString()}
          {isRent && <span className="text-xs font-normal text-muted-foreground">/yr</span>}
        </p>
        <span className="mt-3 block w-full rounded-lg bg-primary/10 py-2 text-center text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          View Property
        </span>
      </div>
    </Link>
  );
};

const PropertyCarousel = ({ properties }: { properties: DBProperty[] }) => {
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
  }, [sync, properties.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  if (properties.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">No properties yet. Check back soon.</p>;
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={sync}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {properties.map((p) => (
          <CarouselCard key={p.id} p={p} />
        ))}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous properties"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          className="h-9 w-9 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next properties"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          className="h-9 w-9 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PropertyCarousel;
