import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import DBPropertyCard, { type DBProperty } from "@/components/DBPropertyCard";
import { supabase } from "@/integrations/supabase/client";

const Properties = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .in("status", ["available", "for_sale", "for_rent"])
        .order("created_at", { ascending: false });
      setProperties((data as DBProperty[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q) ||
      (p.property_type || "").toLowerCase().includes(q);
    const t = typeFilter;
    const ptype = (p.property_type || "").toLowerCase();
    const matchType =
      t === "all" ||
      (t === "for_sale" && (p.status === "for_sale" || p.status === "available")) ||
      (t === "for_rent" && p.status === "for_rent") ||
      (t === "hotel" && ptype === "hotel") ||
      (t === "apartment" && ptype === "apartment") ||
      (t === "estate" && ptype === "estate") ||
      (t === "house" && ptype === "house") ||
      (t === "land" && ptype === "land") ||
      (t === "commercial" && ptype === "commercial");
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Browse Verified Properties for Sale & Rent in Nigeria — Prop Connect</title>
        <meta name="description" content="Search verified houses, apartments, and land for sale or rent across Nigeria. Every listing on Prop Connect is reviewed by our team and posted by a KYC-verified agent." />
        <link rel="canonical" href="https://prop-connecthub.lovable.app/properties" />
        <meta property="og:url" content="https://prop-connecthub.lovable.app/properties" />
        <meta property="og:title" content="Browse Verified Properties for Sale & Rent in Nigeria — Prop Connect" />
        <meta property="og:description" content="Search verified houses, apartments, and land for sale or rent across Nigeria." />
      </Helmet>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Browse Properties</h1>
        <p className="mt-1 text-muted-foreground">Find your perfect property from verified agents</p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search hotel, apartment, estate, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="for_sale">For Sale</SelectItem>
              <SelectItem value="for_rent">For Rent</SelectItem>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="estate">Estate</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="land">Land</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => <DBPropertyCard key={p.id} property={p} />)}
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-lg text-muted-foreground">No properties match your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Properties;
