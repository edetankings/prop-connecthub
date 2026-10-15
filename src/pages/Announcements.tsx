import { useEffect, useState } from "react";
import { Megaphone, AlertTriangle, Bell, MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { DBProperty } from "@/components/DBPropertyCard";

type PropertyWithDate = DBProperty & { created_at: string };

const iconMap: Record<string, any> = { update: Megaphone, alert: AlertTriangle, announcement: Bell, promotion: Megaphone };
const colorMap: Record<string, string> = { update: "bg-primary/10 text-primary", alert: "bg-destructive/10 text-destructive", announcement: "bg-secondary/10 text-secondary", promotion: "bg-secondary/10 text-secondary" };

const Announcements = () => {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [latestProperties, setLatestProperties] = useState<PropertyWithDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = async () => {
    const [annRes, propRes] = await Promise.all([
      (supabase as any)
        .from("announcements")
        .select("*, profiles!announcements_author_id_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("*")
        .eq("is_verified", true)
        .in("status", ["available", "for_sale", "for_rent"])
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    setAnnouncements(annRes.data || []);
    setLatestProperties((propRes.data as PropertyWithDate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!isAdmin) {
      toast.error("Only administrators can delete announcements");
      return;
    }

    try {
      setDeleting(announcementId);
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;

      toast.success("Announcement deleted successfully");
      await loadData(); // Reload data
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    } finally {
      setDeleting(null);
    }
  };

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
            {/* Newly Listed Properties - Text only */}
            {latestProperties.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">🏠 Newly Listed Properties</h2>
                <div className="space-y-3">
                  {latestProperties.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display font-semibold text-foreground">
                            New property listed: {p.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Located at {p.address || p.city}{p.city && p.state ? `, ${p.state}` : p.state || ""}
                            {p.bedrooms ? ` · ${p.bedrooms} bed` : ""}{p.bathrooms ? ` · ${p.bathrooms} bath` : ""}
                            {p.property_type ? ` · ${p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)}` : ""}
                          </p>
                          <p className="mt-1 font-display font-bold text-secondary">₦{p.price?.toLocaleString()}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <Link to={`/property/${p.id}`}>
                            <Button size="sm" variant="link" className="h-auto p-0 mt-2 text-secondary">
                              View full details →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
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
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              disabled={deleting === a.id}
                              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
