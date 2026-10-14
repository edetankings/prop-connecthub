import { siteUrl } from "@/lib/seo";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import DBPropertyCard, { type DBProperty } from "@/components/DBPropertyCard";
import { supabase } from "@/integrations/supabase/client";

const Properties = () => {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(params.get("type") || "all");
  useEffect(() => {
    setTypeFilter(params.get("type") || "all");
  }, [params]);
  const [stateFilter, setStateFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedFilter, setBedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [visible, setVisible] = useState(12);
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

  const states = useMemo(
    () => Array.from(new Set(properties.map((p) => p.state).filter(Boolean) as string[])).sort(),
    [properties]
  );

  const PRICE_RANGES: Record<string, [number, number]> = {
    "0-5m": [0, 5_000_000],
    "5m-20m": [5_000_000, 20_000_000],
    "20m-50m": [20_000_000, 50_000_000],
    "50m-100m": [50_000_000, 100_000_000],
    "100m+": [100_000_000, Number.MAX_SAFE_INTEGER],
  };

  const filteredAll = properties.filter((p) => {
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
    const matchState = stateFilter === "all" || p.state === stateFilter;
    const range = PRICE_RANGES[priceFilter];
    const price = Number(p.price) || 0;
    const matchPrice = !range || (price >= range[0] && price < range[1]);
    const beds = Number((p as { bedrooms?: number }).bedrooms) || 0;
    const matchBeds = bedFilter === "all" || beds >= Number(bedFilter);
    return matchSearch && matchType && matchState && matchPrice && matchBeds;
  });

  const created = (p: DBProperty) => (p as { created_at?: string }).created_at || "";

  const filtered = [...filteredAll].sort((a, b) => {
    if (sortBy === "price_asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === "price_desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === "oldest") return created(a).localeCompare(created(b));
    return created(b).localeCompare(created(a));
  });

  const shown = filtered.slice(0, visible);
  const hasFilters =
    search !== "" || typeFilter !== "all" || stateFilter !== "all" || priceFilter !== "all" || bedFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStateFilter("all");
    setPriceFilter("all");
    setBedFilter("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Browse Verified Properties for Sale & Rent in Nigeria — Prop Connect</title>
        <meta name="description" content="Search verified houses, apartments, and land for sale or rent across Nigeria. Every listing on Prop Connect is reviewed by our team and posted by a KYC-verified agent." />
        <link rel="canonical" href={siteUrl("/properties")} />
        <meta property="og:url" content={siteUrl("/properties")} />
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
            <Input placeholder="Search hotel, apartment, estate, city..." value={search} onChange={(e) => { setSearch(e.target.value); setVisible(12); }} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setVisible(12); }}>
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

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setVisible(12); }}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={(v) => { setPriceFilter(v); setVisible(12); }}>
            <SelectTrigger><SelectValue placeholder="Price" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Price</SelectItem>
              <SelectItem value="0-5m">Under ₦5M</SelectItem>
              <SelectItem value="5m-20m">₦5M – ₦20M</SelectItem>
              <SelectItem value="20m-50m">₦20M – ₦50M</SelectItem>
              <SelectItem value="50m-100m">₦50M – ₦100M</SelectItem>
              <SelectItem value="100m+">₦100M+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bedFilter} onValueChange={(v) => { setBedFilter(v); setVisible(12); }}>
            <SelectTrigger><SelectValue placeholder="Bedrooms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Bedrooms</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{shown.length}</span> of{" "}
                <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "property" : "properties"}
              </p>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Clear filters
                </Button>
              )}
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => <DBPropertyCard key={p.id} property={p} />)}
            </div>

            {visible < filtered.length && (
              <div className="mt-10 flex justify-center">
                <Button size="lg" variant="outline" onClick={() => setVisible((v) => v + 12)}>
                  Load More Properties
                </Button>
              </div>
            )}
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
