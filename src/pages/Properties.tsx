import { useState, useEffect } from "react";
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
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.state || "").toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "all" ||
      (typeFilter === "sale" && (p.status === "for_sale" || p.status === "available")) ||
      (typeFilter === "rent" && p.status === "for_rent");
    return matchSearch && matchType;
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
