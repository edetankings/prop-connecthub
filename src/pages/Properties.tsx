import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { properties } from "@/lib/mockData";

const Properties = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const filtered = properties.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    const matchLocation = locationFilter === "all" || p.location.includes(locationFilter);
    return matchSearch && matchType && matchLocation;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Browse Properties</h1>
        <p className="mt-1 text-muted-foreground">Find your perfect property from verified agents</p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sale">For Sale</SelectItem>
              <SelectItem value="rent">For Rent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="Lagos">Lagos</SelectItem>
              <SelectItem value="Abuja">Abuja</SelectItem>
              <SelectItem value="Port Harcourt">Port Harcourt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-lg text-muted-foreground">No properties match your filters</p>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default Properties;
