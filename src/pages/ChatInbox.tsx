import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Search, SlidersHorizontal, SquarePen, Home, Mic, BadgeCheck, Sparkles } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { attachmentPreview, parseAttachment } from "@/lib/chatAttachments";
import { cn } from "@/lib/utils";
import propAi from "@/assets/prop-ai.png";

interface ThreadWithDetails {
  id: string;
  agent_id: string;
  buyer_id: string;
  property_id: string | null;
  last_message_at: string | null;
  created_at: string;
  other_name: string;
  other_avatar: string | null;
  other_type: string | null;
  other_verified: boolean;
  last_message: string | null;
  last_kind: string | null;
  unread_count: number;
  property_code: string | null;
  property_title: string | null;
  property_image: string | null;
  property_status: string | null;
}

type Tab = "all" | "buyers" | "agents" | "system";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "buyers", label: "Buyers" },
  { id: "agents", label: "Agents" },
  { id: "system", label: "System" },
];


const ChatInbox = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchThreads();

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => fetchThreads())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchThreads = async () => {
    if (!profile) return;

    const { data: threadData, error } = await supabase
      .from("chat_threads")
      .select("*")
      .or(`buyer_id.eq.${profile.id},agent_id.eq.${profile.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error || !threadData) {
      setLoading(false);
      return;
    }

    const enriched: ThreadWithDetails[] = await Promise.all(
      threadData.map(async (thread) => {
        const otherId = thread.buyer_id === profile.id ? thread.agent_id : thread.buyer_id;

        const [{ data: otherProfile }, { data: lastMsg }, { count }, { data: property }] = await Promise.all([
          (supabase as any).rpc("get_chat_participants", { _thread_id: thread.id }).then(async ({ data, error }: any) => {
            const participant = data?.find((p: any) => p.id === otherId);
            const { data: directory } = await supabase.from("public_profiles").select("kyc_verified").eq("id", otherId).maybeSingle();
            return { data: participant ? { ...participant, kyc_verified: directory?.kyc_verified === true } : null, error };
          }),
          supabase
            .from("messages")
            .select("content, created_at")
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("thread_id", thread.id)
            .eq("seen", false)
            .neq("sender_id", profile.id),
          thread.property_id
            ? (supabase as any)
                .from("properties")
                .select("property_code, title, image_url, status")
                .eq("id", thread.property_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return {
          ...thread,
          other_name: otherProfile?.full_name || "Unknown",
          other_avatar: otherProfile?.avatar_url ?? null,
          other_type: otherProfile?.profile_type ?? null,
          other_verified: otherProfile?.kyc_verified === true,
          last_message: lastMsg?.content ? attachmentPreview(lastMsg.content) : null,
          last_kind: lastMsg?.content ? parseAttachment(lastMsg.content)?.kind ?? "text" : null,
          unread_count: count || 0,
          property_code: property?.property_code ?? null,
          property_title: property?.title ?? null,
          property_image: property?.image_url ?? null,
          property_status: property?.status ?? null,
        };

      })
    );

    setThreads(enriched);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === "buyers" && t.other_type !== "buyer") return false;
      if (tab === "agents" && !(t.other_type === "agent" || t.other_type === "builder")) return false;
      if (tab === "system" && t.other_type !== null) return false;
      if (unreadOnly && t.unread_count === 0) return false;
      if (!q) return true;
      return (
        t.other_name.toLowerCase().includes(q) ||
        (t.last_message || "").toLowerCase().includes(q) ||
        (t.property_code || "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.property_id || "").toLowerCase().includes(q)
      );
    });
  }, [threads, query, tab, unreadOnly]);

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-3xl flex-1 px-4 py-5">
        {/* Title row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Messages</h1>
            {totalUnread > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                {totalUnread}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="New message"
            onClick={() => navigate("/agents")}
            className="rounded-xl border-border text-primary transition-transform hover:scale-105"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>

        {/* Search + filter */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages, names, property or transaction ID…"
              className="h-11 rounded-2xl border-transparent bg-muted pl-9 text-sm focus-visible:border-border"
            />
          </div>
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="icon"
            aria-label="Filter unread"
            onClick={() => setUnreadOnly((v) => !v)}
            className="h-11 w-11 rounded-2xl"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Permanent AI assistant conversation */}
        <Link
          to="/ai-assistant"
          className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-secondary/10 px-4 py-3.5 shadow-card transition-all hover:border-primary/50 hover:shadow-lg"
        >
          <img
            src={propAi}
            alt="Prop-Connect AI"
            width={512}
            height={512}
            className="h-12 w-12 shrink-0 rounded-full border border-border bg-card object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="truncate">Prop-Connect AI</span>
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
              <Badge variant="secondary" className="shrink-0 text-[10px]">Official</Badge>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-secondary" />
              <span className="truncate">Ask me about payments, verification, listings or anything property.</span>
            </p>
          </div>
        </Link>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 rounded-2xl bg-card p-4">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="mb-4 h-14 w-14 opacity-25" />
            <p className="text-base font-medium">No conversations found</p>
            <p className="mt-1 text-sm">Start a chat from a property or agent profile</p>
          </div>
        ) : (
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {filtered.map((thread) => (
              <Link
                key={thread.id}
                to={`/chat/${thread.id}`}
                className="flex items-start gap-3 px-3 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted sm:px-4"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={thread.other_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {thread.other_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-[hsl(var(--success))]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-1 font-semibold text-foreground">
                      <span className="truncate">{thread.other_name}</span>
                      {thread.other_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </h3>
                    <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">
                      {formatTime(thread.last_message_at)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground">
                      {thread.last_kind === "voice" && <Mic className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      <span className="truncate">{thread.last_message || "No messages yet"}</span>
                    </p>
                    {thread.unread_count > 0 && (
                      <Badge className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
                        {thread.unread_count}
                      </Badge>
                    )}
                  </div>

                  {thread.property_id && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/60 p-1.5">
                      <div className="h-9 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {thread.property_image ? (
                          <img
                            src={thread.property_image}
                            alt={thread.property_title || "Property"}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Home className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {thread.property_title || "Linked property"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          {thread.property_code && (
                            <span className="font-mono text-[10px] text-muted-foreground">{thread.property_code}</span>
                          )}
                          {thread.property_status && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] capitalize">
                              {thread.property_status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AuthenticatedLayout>
  );
};

export default ChatInbox;
