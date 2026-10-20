import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useFinancialAvailability } from "@/hooks/useFinancialAvailability";
import { Handshake, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

type Deal = {
  id: string;
  buyer_id: string;
  property_id: string;
  property_code: string | null;
  buyer_message: string | null;
  status: string;
  created_at: string;
  decline_reason: string | null;
  transaction_id: string | null;
  properties?: { title: string; price: number; city: string | null; state: string | null; image_url: string | null };
  buyer?: { full_name: string | null };
};

const statusColors: Record<string, string> = {
  pending: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  accepted: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

const AgentDeals = () => {
  const finance = useFinancialAvailability();
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<Deal | null>(null);
  const [reason, setReason] = useState("");

  const [loadError, setLoadError] = useState(false);
  const revision = useRef(0);
  const userId = user?.id;
  const invalidate = useCallback(() => { revision.current++; }, []);
  const load = useCallback(async () => {
    const request = ++revision.current;
    setDeals([]); setLoadError(false); setLoading(true);
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("deal_requests")
        .select("*, properties(title, price, city, state, image_url)")
        .eq("agent_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data as Deal[]) || [];
      await Promise.all(rows.map(async row => {
        const { data: participants, error: participantError } = await supabase.rpc("get_deal_participants", { _deal_id: row.id });
        if (participantError) throw participantError;
        row.buyer = { full_name: participants?.find(person => person.user_id === row.buyer_id)?.full_name || "Buyer" };
      }));
      if (request === revision.current) setDeals(rows);
    } catch {
      if (request === revision.current) setLoadError(true);
    } finally {
      if (request === revision.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => { void load(); return invalidate; }, [load, invalidate]);

  const accept = async (id: string) => {
    if (!finance.enabled) { toast.error(finance.unavailableMessage); return; }
    setBusy(id);
    const { error } = await (supabase as any).rpc("accept_deal", { _request_id: id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal accepted — buyer can now complete secure payment.");
    load();
  };

  const submitDecline = async () => {
    if (!declineFor || !reason.trim()) { toast.error("Reason required"); return; }
    setBusy(declineFor.id);
    const { error } = await (supabase as any).rpc("decline_deal", {
      _request_id: declineFor.id, _reason: reason,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal declined");
    setDeclineFor(null); setReason("");
    load();
  };

  const pending = deals.filter((d) => d.status === "pending");
  const history = deals.filter((d) => d.status !== "pending");

  return (
    <AuthenticatedLayout>
      <Helmet><title>Deals · Prop-Connect</title></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Deals</h1>
            {!finance.enabled && <p role="status" className="text-sm text-muted-foreground">{finance.unavailableMessage}</p>}
            <p className="text-sm text-muted-foreground">
              Approve buyer requests to unlock the secure payment link.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : loadError ? (
          <div role="alert" className="buyer-empty"><h2>Deal requests unavailable</h2><p>Your records could not be loaded. Please try again.</p><Button variant="outline" onClick={() => void load()}>Retry deal requests</Button></div>
        ) : (
          <>
            <Section title="Pending requests" empty="No pending requests right now.">
              {pending.map((d) => (
                <DealCard
                  key={d.id}
                  d={d}
                  primaryAction={
                    <Button
                      size="sm"
                      onClick={() => accept(d.id)}
                      disabled={busy === d.id || !finance.enabled}
                      className="w-full gap-1 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 sm:w-auto"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Accept Deal
                    </Button>
                  }
                  secondaryAction={
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1 text-destructive sm:w-auto"
                      onClick={() => { setDeclineFor(d); setReason(""); }}
                    >
                      <XCircle className="h-4 w-4" /> Decline
                    </Button>
                  }
                />
              ))}
            </Section>

            <Section title="History" empty="No past deal requests.">
              {history.map((d) => (
                <DealCard
                  key={d.id}
                  d={d}
                  primaryAction={
                    d.status === "accepted" && d.transaction_id ? (
                      <Link to={`/deal/${d.id}`} className="w-full sm:w-auto">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">Open Deal Room</Button>
                      </Link>
                    ) : null
                  }
                />
              ))}
            </Section>
          </>
        )}
      </div>

      <Dialog open={!!declineFor} onOpenChange={(o) => !o && setDeclineFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decline this deal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Let the buyer know why so they can adjust or look elsewhere.
          </p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Already let to another tenant…" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclineFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDecline}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
};

const Section = ({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) => {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-3">
        {isEmpty ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">{empty}</div>
        ) : children}
      </div>
    </div>
  );
};

const DealCard = ({ d, primaryAction, secondaryAction }: { d: Deal; primaryAction?: React.ReactNode; secondaryAction?: React.ReactNode }) => (
  <div className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/property/${d.property_id}`} className="font-semibold hover:underline break-words">
            {d.properties?.title || "Property"}
          </Link>
          <Badge className={`text-[10px] sm:text-xs ${statusColors[d.status] || ""}`}>
            {d.status.toUpperCase()}
          </Badge>
          {d.property_code && (
            <Badge variant="outline" className="font-mono text-[10px] sm:text-xs break-all">{d.property_code}</Badge>
          )}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <p className="text-muted-foreground">Buyer: <span className="font-medium text-foreground">{d.buyer?.full_name || "Buyer"}</span></p>
          <p className="text-muted-foreground">Price: <span className="font-semibold text-foreground">₦{d.properties?.price?.toLocaleString()}</span></p>
          <p className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {new Date(d.created_at).toLocaleString()}</p>
        </div>
        {d.buyer_message && (
          <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground italic break-words">"{d.buyer_message}"</p>
        )}
        {d.decline_reason && (
          <p className="mt-2 text-xs text-destructive break-words">Decline reason: {d.decline_reason}</p>
        )}
      </div>
      <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  </div>
);

export default AgentDeals;
