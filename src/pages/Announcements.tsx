import { useEffect, useState } from "react";
import { Megaphone, AlertTriangle, Bell, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import type { DBProperty } from "@/components/DBPropertyCard";

const iconMap: Record<string, any> = { update: Megaphone, alert: AlertTriangle, announcement: Bell, promotion: Megaphone };
const colorMap: Record<string, string> = { update: "bg-primary/10 text-primary", alert: "bg-destructive/10 text-destructive", announcement: "bg-secondary/10 text-secondary", promotion: "bg-secondary/10 text-secondary" };

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [latestProperties, setLatestProperties] = useState<DBProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [annRes, propRes] = await Promise.all([
        (supabase as any)
          .from("announcements")
          .select("*, profiles!announcements_author_id_fkey(full_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("properties")
          .select("*")
          .in("status", ["available", "for_sale", "for_rent"])
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      setAnnouncements(annRes.data || []);
      setLatestProperties((propRes.data as DBProperty[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Announcements</h1>
        <p className="mt-1 text-muted-foreground">Latest property listings & platform updates</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Newly Listed Properties */}
            {latestProperties.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">🏠 Newly Listed Properties</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {latestProperties.map((p) => (
                    <Link key={p.id} to={`/property/${p.id}`} className="group rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
                      <div className="h-40 bg-muted overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-semibold text-foreground truncate">{p.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {p.city}{p.state ? `, ${p.state}` : ""}
                        </p>
                        <p className="mt-2 font-display font-bold text-secondary">₦{p.price?.toLocaleString()}</p>
                        <Button size="sm" className="mt-3 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                          View Property
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Custom Announcements */}
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">📢 Platform Updates</h2>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No announcements yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a: any) => {
                    const Icon = iconMap[a.type] || Bell;
                    const colorClass = colorMap[a.type] || "bg-muted text-muted-foreground";
                    return (
                      <div key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-semibold text-foreground">{a.title}</h3>
                              <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{a.content}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {a.profiles?.full_name ? `By ${a.profiles.full_name} · ` : ""}
                              {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Announcements;
