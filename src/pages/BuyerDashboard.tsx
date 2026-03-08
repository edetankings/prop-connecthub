import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, Home, Search, User, BookmarkCheck, MapPin, Bed, Bath, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

const statusColors: Record<string, string> = {
  pending: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  confirmed: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
};

const BuyerDashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [stats, setStats] = useState({ reservations: 0, messages: 0 });

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch reservations with property info
    (supabase as any)
      .from("reservations")
      .select("*, properties(title, city, state, price, image_url)")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        setReservations(data || []);
        setStats((s) => ({ ...s, reservations: data?.length || 0 }));
      });

    // Fetch chat threads
    supabase
      .from("chat_threads")
      .select("*, messages(content, created_at, seen), agent:agent_id(full_name, avatar_url)")
      .eq("buyer_id", profile.id)
      .order("last_message_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setThreads(data || []);
        const unread = (data || []).reduce((acc: number, t: any) => {
          const msgs = t.messages || [];
          return acc + msgs.filter((m: any) => !m.seen).length;
        }, 0);
        setStats((s) => ({ ...s, messages: unread }));
      });

    // Recommended properties
    supabase
      .from("properties")
      .select("*")
      .eq("status", "available")
      .limit(6)
      .then(({ data }) => setRecommended(data || []));
  }, [profile?.id]);

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Greeting */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Hello, {firstName}! 👋</h1>
            <p className="mt-1 text-muted-foreground">Find your dream home today</p>
          </div>
          <button className="relative rounded-full border border-border bg-card p-2 shadow-card hover:bg-muted transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground flex items-center justify-center">
              {stats.messages > 9 ? "9+" : stats.messages}
            </span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
            <BookmarkCheck className="mx-auto mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">{stats.reservations}</p>
            <p className="text-xs text-muted-foreground">Reservations</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
            <Heart className="mx-auto mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Saved Properties</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
            <MessageCircle className="mx-auto mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">{stats.messages}</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </div>
        </div>

        {/* My Reservations */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">My Reservations</h2>
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No reservations yet.{" "}
              <Link to="/properties" className="text-secondary hover:underline font-medium">Browse properties →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <div key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden">
                    {r.properties?.image_url && (
                      <img src={r.properties.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{r.properties?.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{r.properties?.city}, {r.properties?.state}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm font-semibold text-secondary">
                        ₦{r.properties?.price?.toLocaleString()}
                      </p>
                      {r.viewing_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarCheck className="h-3 w-3" /> {new Date(r.viewing_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${statusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabels[r.status] || r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Chats */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Recent Chats</h2>
          {threads.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No chats yet.{" "}
              <Link to="/agents" className="text-secondary hover:underline font-medium">Find an agent →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => {
                const lastMsg = (t.messages || []).sort((a: any, b: any) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];
                const unread = (t.messages || []).filter((m: any) => !m.seen).length;
                return (
                  <Link key={t.id} to={`/chat/${t.id}`}>
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {t.agent?.full_name?.[0] || "A"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{t.agent?.full_name || "Agent"}</p>
                        <p className="text-xs text-muted-foreground truncate">{lastMsg?.content || "No messages yet"}</p>
                      </div>
                      {unread > 0 && (
                        <span className="h-5 w-5 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recommended For You */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-foreground">Recommended For You</h2>
            <Link to="/properties">
              <Button variant="ghost" size="sm" className="text-secondary">View All →</Button>
            </Link>
          </div>
          {recommended.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
              No properties available yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommended.map((p) => (
                <Link key={p.id} to={`/property/${p.id}`}>
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-elevated transition-shadow group">
                    <div className="relative h-40 bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{p.city}, {p.state}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms} bd</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms} ba</span>}
                      </div>
                      <p className="mt-2 font-bold text-secondary">₦{p.price?.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </AuthenticatedLayout>
  );
};

export default BuyerDashboard;
