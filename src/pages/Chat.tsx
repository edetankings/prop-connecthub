import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  seen: boolean;
  created_at: string;
}

const Chat = () => {
  const { threadId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // If navigating via /chat/new?agent=<profileId>&property=<propertyId>
  const agentProfileId = searchParams.get("agent");
  const propertyId = searchParams.get("property");

  // Find or create thread
  useEffect(() => {
    if (!profile) return;

    const init = async () => {
      // If threadId is provided directly (from inbox), use it
      if (threadId && threadId !== "new") {
        setCurrentThreadId(threadId);
        await loadThreadDetails(threadId);
        return;
      }

      // If creating new chat with an agent
      if (agentProfileId) {
        // Check existing thread
        const { data: existing } = await supabase
          .from("chat_threads")
          .select("id")
          .or(
            `and(buyer_id.eq.${profile.id},agent_id.eq.${agentProfileId}),and(buyer_id.eq.${agentProfileId},agent_id.eq.${profile.id})`
          )
          .maybeSingle();

        if (existing) {
          setCurrentThreadId(existing.id);
          await loadThreadDetails(existing.id);
          navigate(`/chat/${existing.id}`, { replace: true });
        } else {
          // Create new thread
          const { data: newThread, error } = await supabase
            .from("chat_threads")
            .insert({
              buyer_id: profile.id,
              agent_id: agentProfileId,
              property_id: propertyId || null,
            })
            .select("id")
            .single();

          if (newThread) {
            setCurrentThreadId(newThread.id);
            await loadOtherUser(agentProfileId);
            navigate(`/chat/${newThread.id}`, { replace: true });
          }
        }
      }
      setLoading(false);
    };

    init();
  }, [profile, threadId, agentProfileId]);

  const loadThreadDetails = async (tId: string) => {
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("id", tId)
      .single();

    if (thread && profile) {
      const otherId = thread.buyer_id === profile.id ? thread.agent_id : thread.buyer_id;
      await loadOtherUser(otherId);
    }
    setLoading(false);
  };

  const loadOtherUser = async (otherId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", otherId)
      .maybeSingle();

    setOtherUser({
      name: data?.full_name || "Unknown",
      avatar: data?.avatar_url || null,
    });
  };

  // Load messages
  useEffect(() => {
    if (!currentThreadId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", currentThreadId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data as ChatMessage[]);
    };

    loadMessages();

    // Mark messages as seen
    if (profile) {
      supabase
        .from("messages")
        .update({ seen: true })
        .eq("thread_id", currentThreadId)
        .neq("sender_id", profile.id)
        .eq("seen", false)
        .then();
    }

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${currentThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${currentThreadId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as seen if from other user
          if (profile && newMsg.sender_id !== profile.id) {
            supabase.from("messages").update({ seen: true }).eq("id", newMsg.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${currentThreadId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentThreadId, profile]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || !currentThreadId || !profile) return;
    const text = input.trim();
    setInput("");

    await supabase.from("messages").insert({
      thread_id: currentThreadId,
      sender_id: profile.id,
      content: text,
    });

    // Update last_message_at
    await supabase
      .from("chat_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", currentThreadId);
  }, [input, currentThreadId, profile]);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading chat...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!currentThreadId) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <p>Chat not found</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-1 flex-col min-h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <Link to="/messages" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {otherUser?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display font-semibold text-foreground">{otherUser?.name || "Chat"}</h2>
              <p className="text-xs text-success">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="container mx-auto max-w-2xl space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                No messages yet. Say hello! 👋
              </p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === profile?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-sm ${
                      isMine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                        isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMine &&
                        (msg.seen ? (
                          <CheckCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="container mx-auto flex max-w-2xl gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1"
            />
            <Button onClick={send} className="bg-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Chat;
