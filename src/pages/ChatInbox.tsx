import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ThreadWithDetails {
  id: string;
  agent_id: string;
  buyer_id: string;
  property_id: string | null;
  last_message_at: string | null;
  created_at: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  unread_count: number;
}

const ChatInbox = () => {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<ThreadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchThreads();

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchThreads();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => {
        fetchThreads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", otherId)
          .maybeSingle();

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("thread_id", thread.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .eq("seen", false)
          .neq("sender_id", profile.id);

        return {
          ...thread,
          other_name: otherProfile?.full_name || "Unknown",
          other_avatar: otherProfile?.avatar_url,
          last_message: lastMsg?.content || null,
          unread_count: count || 0,
        };
      })
    );

    setThreads(enriched);
    setLoading(false);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-2xl flex-1 px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Messages</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Start a chat from a property or agent profile</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to={`/chat/${thread.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={thread.other_avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {thread.other_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate">{thread.other_name}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatTime(thread.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">
                      {thread.last_message || "No messages yet"}
                    </p>
                    {thread.unread_count > 0 && (
                      <Badge className="ml-2 bg-primary text-primary-foreground text-xs h-5 min-w-[20px] flex items-center justify-center rounded-full">
                        {thread.unread_count}
                      </Badge>
                    )}
                  </div>
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
