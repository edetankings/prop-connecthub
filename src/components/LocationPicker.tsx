import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2 } from "lucide-react";

// Fix default marker icon URLs (Leaflet + bundlers issue)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onChange: (loc: { lat: number; lng: number; address: string }) => void;
}

const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];

function MapFlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.8 });
  }, [position, map]);
  return null;
}

const LocationPicker = ({ initialLat, initialLng, initialAddress, onChange }: LocationPickerProps) => {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState(initialAddress || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onChange({ lat, lng, address: addr });
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallback);
      onChange({ lat, lng, address: fallback });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ng&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        const addr = data[0].display_name;
        setAddress(addr);
        onChange({ lat, lng, address: addr });
      }
    } finally {
      setSearching(false);
    }
  };

  const eventHandlers = {
    dragend: () => {
      const m = markerRef.current;
      if (m) {
        const { lat, lng } = m.getLatLng();
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      }
    },
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search location (e.g. Calabar, Cross River)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" onClick={handleSearch} disabled={searching} className="gap-2 shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </div>

      <div className="h-72 w-full overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={position || NIGERIA_CENTER}
          zoom={position ? 15 : 6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo position={position} />
          {position && (
            <Marker
              draggable
              position={position}
              ref={(r) => {
                markerRef.current = r;
              }}
              eventHandlers={eventHandlers}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs">
        <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {position ? (
            <>
              <p className="font-medium text-foreground break-words">{address || "Pin dropped"}</p>
              <p className="text-muted-foreground mt-0.5">
                Lat: {position[0].toFixed(5)} · Lng: {position[1].toFixed(5)} · Drag pin to adjust
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Search a location or click below to use Nigeria as starting point. Drag the pin to refine.</p>
          )}
        </div>
      </div>
      {!position && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPosition(NIGERIA_CENTER);
            reverseGeocode(NIGERIA_CENTER[0], NIGERIA_CENTER[1]);
          }}
        >
          Drop pin to start
        </Button>
      )}
    </div>
  );
};

export default LocationPicker;
