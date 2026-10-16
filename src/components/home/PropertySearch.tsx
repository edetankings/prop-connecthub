import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const intents = [
  { label: "Buy", value: "for_sale" },
  { label: "Rent", value: "for_rent" },
  { label: "Land", value: "land" },
] as const;

export default function PropertySearch() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<string>("for_sale");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("all");
  const [kind, setKind] = useState("all");
  const [rooms, setRooms] = useState("all");

  return (
    <form className="premium-search" aria-label="Find a property"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({ type: intent });
        if (location.trim()) params.set("q", location.trim());
        if (price !== "all") params.set("price", price);
        if (intent !== "land" && kind !== "all") params.set("kind", kind);
        if (intent !== "land" && rooms !== "all") params.set("beds", rooms);
        navigate(`/properties?${params}`);
      }}>
      <div className="search-panel-heading"><h2 className="font-display text-2xl font-semibold tracking-tight">Find your kind of place.</h2>
        <fieldset className="flex gap-1 rounded-full border border-[#dce4de] p-1">
          <legend className="sr-only">Looking to</legend>
          {intents.map(({ label, value }) => (
            <label key={value} className="relative !block cursor-pointer">
              <input type="radio" name="intent" value={value} checked={intent === value}
                onChange={() => setIntent(value)} className="peer sr-only" />
              <span className="block rounded-full px-5 py-2.5 text-sm peer-checked:bg-[#0B4938] peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#138562]">{label}</span>
            </label>
          ))}
        </fieldset>

      </div>
      <div className="search-fields">
        <label htmlFor="home-kind">Property type
          <select id="home-kind" disabled={intent === "land"} value={intent === "land" ? "all" : kind} onChange={event => setKind(event.target.value)}><option value="all">{intent === "land" ? "Land" : "All properties"}</option><option value="house">House</option><option value="apartment">Apartment</option><option value="commercial">Commercial</option></select>
        </label>
        <label htmlFor="home-location">Where would you like to live?
          <input id="home-location" autoComplete="off" placeholder="City, area or neighbourhood" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label htmlFor="home-budget">Your budget
          <select id="home-budget" value={price} onChange={(event) => setPrice(event.target.value)}>
            <option value="all">Any price</option>
            <option value="0-5m">Under ₦5 million</option>
            <option value="5m-20m">₦5 – ₦20 million</option>
            <option value="20m-50m">₦20 – ₦50 million</option>
            <option value="50m-100m">₦50 – ₦100 million</option>
            <option value="100m+">₦100 million and above</option>
          </select>
        </label>
        <label htmlFor="home-rooms">Bedrooms
          <select id="home-rooms" disabled={intent === "land"} value={intent === "land" ? "all" : rooms} onChange={event => setRooms(event.target.value)}><option value="all">Any number</option><option value="1">1+ bedroom</option><option value="2">2+ bedrooms</option><option value="3">3+ bedrooms</option><option value="4">4+ bedrooms</option></select>
        </label>
      </div>
      <div className="search-panel-footer"><span className="text-xs text-[#607067]">Your space. Your pace. Your next chapter.</span><Button type="submit" className="h-12 gap-3 px-6"><Search aria-hidden="true" /> Find a property</Button>
      </div>
    </form>
  );
}
