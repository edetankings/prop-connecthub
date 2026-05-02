import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search } from "lucide-react";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onChange: (loc: { lat: number; lng: number; address: string }) => void;
}

const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];

const LocationPicker = ({ initialLat, initialLng, initialAddress, onChange }: LocationPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState(initialAddress || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const applyLocation = async (lat: number, lng: number, knownAddress?: string) => {
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    let nextAddress = knownAddress || fallback;
    if (!knownAddress) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
          headers: { "Accept-Language": "en" },
        });
        const data = await res.json();
        nextAddress = data.display_name || fallback;
      } catch {
        nextAddress = fallback;
      }
    }
    setPosition([lat, lng]);
    setAddress(nextAddress);
    onChange({ lat, lng, address: nextAddress });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(position || NIGERIA_CENTER, position ? 15 : 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => applyLocation(event.latlng.lat, event.latlng.lng));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { draggable: true, icon: defaultIcon }).addTo(map);
      markerRef.current.on("dragend", () => {
        const next = markerRef.current?.getLatLng();
        if (next) applyLocation(next.lat, next.lng);
      });
    } else {
      markerRef.current.setLatLng(position);
    }
    map.flyTo(position, 15, { duration: 0.6 });
  }, [position]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ng&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.[0]) await applyLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Search location (e.g. Calabar, Cross River)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())} />
        <Button type="button" onClick={handleSearch} disabled={searching} className="gap-2 shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </Button>
      </div>
      <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-xl border border-border" />
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs">
        <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {position ? (
            <><p className="font-medium text-foreground break-words">{address || "Pin dropped"}</p><p className="text-muted-foreground mt-0.5">Lat: {position[0].toFixed(5)} · Lng: {position[1].toFixed(5)} · Drag pin to adjust</p></>
          ) : <p className="text-muted-foreground">Search a location, click the map, or drop a pin to start.</p>}
        </div>
      </div>
      {!position && <Button type="button" variant="outline" size="sm" onClick={() => applyLocation(NIGERIA_CENTER[0], NIGERIA_CENTER[1])}>Drop pin to start</Button>}
    </div>
  );
};

export default LocationPicker;