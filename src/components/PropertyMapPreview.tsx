import { useEffect, useRef } from "react";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin } from "lucide-react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface PropertyMapPreviewProps {
  lat: number;
  lng: number;
  address?: string | null;
}

const PropertyMapPreview = ({ lat, lng, address }: PropertyMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, dragging: false }).setView([lat, lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
    L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
    return () => map.remove();
  }, [lat, lng]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div ref={containerRef} className="h-64 w-full" />
      <div className="flex items-center justify-between gap-3 p-3 border-t border-border">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground truncate">{address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</p>
        </div>
        <a href={osmUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-1 shrink-0">
            <ExternalLink className="h-3 w-3" /> View on Map
          </Button>
        </a>
      </div>
    </div>
  );
};

export default PropertyMapPreview;