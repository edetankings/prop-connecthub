import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2 } from "lucide-react";
import { stageLabel } from "./DealRoom";

/** Buyer "My deals" and admin "All deals" overview. */
const DealsList = ({ mode }: { mode: "buyer" | "admin" }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    let q = (supabase as any).from("deal_requests").select("*, properties(title, price, city, state)").order("created_at", { ascending: false });
    if (mode === "buyer") q = q.eq("buyer_id", user.id);
    q.then(({ data }: any) => { setRows(data || []); setLoading(false); });
  }, [user?.id, mode]);

  const stages = ["all", "pending_agent", "payment_pending", "payment_under_review", "payment_confirmed", "completed", "declined", "cancelled", "disputed"];
  const shown = rows.filter((r) => filter === "all" || r.stage === filter);

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{mode === "admin" ? "All deals" : "My deals"} · Prop-Connect</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Handshake className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{mode === "admin" ? "All deals" : "My deals"}</h1>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {stages.map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s === "all" ? "All" : stageLabel(s)}</Button>
          ))}
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="mt-4 space-y-3">
            {shown.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No deals yet.</div>}
            {shown.map((d) => (
              <Link key={d.id} to={`/deal/${d.id}`} className="block rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-elevated">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">#{d.deal_number}</p>
                    <p className="font-semibold">{d.properties?.title || "Property"}</p>
                    <p className="text-sm text-muted-foreground">₦{Number(d.properties?.price || 0).toLocaleString()} · {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline">{stageLabel(d.stage)}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsList;
