import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCheck, Check, ShieldAlert, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { containsContactInfo, BLOCKED_MESSAGE, AI_QUICK_OPTIONS } from "@/lib/chatFilter";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  seen: boolean;
  is_blocked: boolean;
  created_at: string;
}

const Chat = () => {
  const { threadId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null);
  const [threadStatus, setThreadStatus] = useState<string>("restricted");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const agentProfileId = searchParams.get("agent");
  const propertyId = searchParams.get("property");

  // Find or create thread
  useEffect(() => {
    if (!profile) return;
    const init = async () => {
      if (threadId && threadId !== "new") {
        setCurrentThreadId(threadId);
        await loadThreadDetails(threadId);
        return;
      }
      if (agentProfileId) {
        const { data: existing } = await supabase
          .from("chat_threads")
          .select("id, status")
          .or(`and(buyer_id.eq.${profile.id},agent_id.eq.${agentProfileId}),and(buyer_id.eq.${agentProfileId},agent_id.eq.${profile.id})`)
          .maybeSingle();

        if (existing) {
          setCurrentThreadId(existing.id);
          setThreadStatus((existing as any).status || "restricted");
          await loadThreadDetails(existing.id);
          navigate(`/chat/${existing.id}`, { replace: true });
        } else {
          const { data: newThread } = await supabase
            .from("chat_threads")
            .insert({ buyer_id: profile.id, agent_id: agentProfileId, property_id: propertyId || null } as any)
            .select("id, status")
            .single();
          if (newThread) {
            setCurrentThreadId(newThread.id);
            setThreadStatus((newThread as any).status || "restricted");
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
    const { data: thread } = await supabase.from("chat_threads").select("*").eq("id", tId).single();
    if (thread && profile) {
      setThreadStatus((thread as any).status || "restricted");
      const otherId = thread.buyer_id === profile.id ? thread.agent_id : thread.buyer_id;
      await loadOtherUser(otherId);
    }
    setLoading(false);
  };

  const loadOtherUser = async (otherId: string) => {
    const { data } = await (supabase as any).from("public_profiles").select("full_name, avatar_url").eq("id", otherId).maybeSingle();
    setOtherUser({ name: data?.full_name || "Unknown", avatar: data?.avatar_url || null });
  };

  // Load messages
  useEffect(() => {
    if (!currentThreadId) return;
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("*").eq("thread_id", currentThreadId).order("created_at", { ascending: true });
      if (data) setMessages(data as ChatMessage[]);
    };
    loadMessages();

    if (profile) {
      supabase.from("messages").update({ seen: true }).eq("thread_id", currentThreadId).neq("sender_id", profile.id).eq("seen", false).then();
    }

    const channel = supabase
      .channel(`chat-${currentThreadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${currentThreadId}` }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => (prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        if (profile && newMsg.sender_id !== profile.id) {
          supabase.from("messages").update({ seen: true }).eq("id", newMsg.id).then();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${currentThreadId}` }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentThreadId, profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !currentThreadId || !profile) return;
    const isBlocked = containsContactInfo(text);
    
    if (isBlocked) {
      // Insert blocked message
      await supabase.from("messages").insert({
        thread_id: currentThreadId,
        sender_id: profile.id,
        content: BLOCKED_MESSAGE,
        is_blocked: true,
      } as any);
      toast.error("Contact sharing is not allowed on this platform.");
      return;
    }

    await supabase.from("messages").insert({
      thread_id: currentThreadId,
      sender_id: profile.id,
      content: text,
    } as any);

    await supabase.from("chat_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", currentThreadId);
  }, [currentThreadId, profile]);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  }, [input, sendMessage]);

  const handleQuickOption = async (option: string) => {
    await sendMessage(option);
  };

  const handleInterested = async () => {
    if (!currentThreadId || !profile) return;
    
    // Update thread status to active
    await supabase.from("chat_threads").update({ status: "active" } as any).eq("id", currentThreadId);
    setThreadStatus("active");

    // Send system message
    await supabase.from("messages").insert({
      thread_id: currentThreadId,
      sender_id: profile.id,
      content: "🤝 I'm interested in this property! Let's discuss further.",
    } as any);

    // Notify admin
    const { data: thread } = await supabase.from("chat_threads").select("*, profiles!chat_threads_agent_id_fkey(full_name, user_id)").eq("id", currentThreadId).single();
    if (thread) {
      // Get all admin user_ids
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (adminRoles) {
        for (const role of adminRoles) {
          await (supabase as any).from("notifications").insert({
            user_id: role.user_id,
            title: "🔥 New Active Deal",
            message: `${profile.full_name} is interested in a property. Chat is now active.`,
            type: "info",
            link: `/admin`,
          });
        }
      }
    }

    toast.success("Chat is now active! You can type freely (contact sharing still blocked).");
  };

  const isRestricted = threadStatus === "restricted";

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
            <div className="flex-1">
              <h2 className="font-display font-semibold text-foreground">{otherUser?.name || "Chat"}</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-success">Online</p>
                {isRestricted && (
                  <span className="flex items-center gap-1 text-xs text-warning font-medium">
                    <ShieldAlert className="h-3 w-3" /> Restricted
                  </span>
                )}
                {!isRestricted && (
                  <span className="flex items-center gap-1 text-xs text-success font-medium">
                    <Heart className="h-3 w-3" /> Active Deal
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="container mx-auto max-w-2xl space-y-3">
            {/* AI Notice */}
            {isRestricted && messages.length === 0 && (
              <div className="bg-muted/50 border border-border rounded-xl p-4 text-center mb-4">
                <ShieldAlert className="h-6 w-6 text-warning mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">AI-Guided Chat</p>
                <p className="text-xs text-muted-foreground">
                  Use the quick options below to start your conversation. Contact sharing is permanently blocked.
                </p>
              </div>
            )}

            {messages.length === 0 && !isRestricted && (
              <p className="text-center text-sm text-muted-foreground py-10">No messages yet. Say hello! 👋</p>
            )}

            {messages.map((msg) => {
              const isMine = msg.sender_id === profile?.id;
              const blocked = (msg as any).is_blocked;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-sm ${
                      blocked
                        ? "rounded-br-md bg-destructive/10 text-destructive border border-destructive/20"
                        : isMine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                      blocked ? "text-destructive/60" : isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {isMine && !blocked && (msg.seen ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick Options (restricted mode) */}
        {isRestricted && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <div className="container mx-auto max-w-2xl">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick questions:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {AI_QUICK_OPTIONS.map((opt) => (
                  <Button key={opt} variant="outline" size="sm" className="text-xs" onClick={() => handleQuickOption(opt)}>
                    {opt}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleInterested}
                className="w-full bg-success text-success-foreground hover:bg-success/90 font-semibold gap-2"
                size="sm"
              >
                <Heart className="h-4 w-4" /> I'm Interested in this Property
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="container mx-auto flex max-w-2xl gap-2">
            {isRestricted ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                <ShieldAlert className="h-4 w-4 mr-2 text-warning" />
                Click a quick option or "I'm Interested" to start chatting
              </div>
            ) : (
              <Input
                placeholder="Type a message... (contact sharing blocked)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1"
              />
            )}
            <Button onClick={send} disabled={isRestricted || !input.trim()} className="bg-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Chat;
