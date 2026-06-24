import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Search, ExternalLink } from "lucide-react";

const STATUSES = [
  "all",
  "under_verification",
  "available",
  "for_sale",
  "for_rent",
  "payment_pending",
  "transaction_in_progress",
  "sold",
  "rented",
  "draft",
] as const;
type Status = typeof STATUSES[number];

const statusColor: Record<string, string> = {
  under_verification: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  available: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  for_sale: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  for_rent: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  payment_pending: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
  transaction_in_progress: "bg-primary/15 text-primary",
  sold: "bg-muted text-muted-foreground",
  rented: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
};

const AdminPropertyMonitoring = () => {
  const [tab, setTab] = useState<Status>("all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("properties")
      .select("id,title,property_code,city,state,price,status,image_url,created_at,agent_id,profiles:agent_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (tab !== "all") query = query.eq("status", tab);
    const { data } = await query;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title?.toLowerCase().includes(s) ||
        r.property_code?.toLowerCase().includes(s) ||
        r.city?.toLowerCase().includes(s) ||
        r.state?.toLowerCase().includes(s) ||
        r.profiles?.full_name?.toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Property Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              Track every listing through its full lifecycle — from submission to sale.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-card">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code, title, city, agent…"
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="h-auto flex-wrap">
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">No properties.</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <div key={p.id} className="rounded-xl border bg-card p-4 shadow-card">
                    <div className="flex flex-wrap items-start gap-4">
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="h-20 w-28 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-[200px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold break-words">{p.title}</p>
                          <Badge className={`text-xs ${statusColor[p.status] || ""}`}>
                            {p.status?.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          {p.property_code && (
                            <Badge variant="outline" className="font-mono text-xs break-all">
                              {p.property_code}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                          <p className="text-muted-foreground">
                            Price: <span className="font-semibold text-foreground">₦{p.price?.toLocaleString()}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Location: <span className="text-foreground">{p.city}, {p.state}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Agent: <span className="text-foreground">{p.profiles?.full_name || p.agent_id?.slice(0, 8)}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Created: <span className="text-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Link to={`/property/${p.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
};

export default AdminPropertyMonitoring;
