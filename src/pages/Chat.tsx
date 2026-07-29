import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ShieldAlert, Heart, Phone, MoreVertical, ShieldCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { containsContactInfo, BLOCKED_MESSAGE, AI_QUICK_OPTIONS } from "@/lib/chatFilter";
import { toast } from "sonner";
import { MessageBubble, type BubbleMessage } from "@/components/chat/MessageBubble";
import { AttachmentMenu } from "@/components/chat/AttachmentMenu";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { ChatPropertyCard, type ChatProperty } from "@/components/chat/ChatPropertyCard";
import { encodeAttachment, fileKind, uploadChatFile } from "@/lib/chatAttachments";

const PAGE_SIZE = 30;

const Chat = () => {
  const { threadId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; avatar: string | null } | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId || null);
  const [threadStatus, setThreadStatus] = useState<string>("restricted");
  const [property, setProperty] = useState<ChatProperty | null>(null);
  const [isBuyer, setIsBuyer] = useState(true);
  const [dealStatus, setDealStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingFile, setSendingFile] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [msgQuery, setMsgQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<any>(null);

  const agentProfileId = searchParams.get("agent");
  const propertyId = searchParams.get("property");

  /* ---------------- thread bootstrap (unchanged backend logic) ---------------- */
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
          .or(
            `and(buyer_id.eq.${profile.id},agent_id.eq.${agentProfileId}),and(buyer_id.eq.${agentProfileId},agent_id.eq.${profile.id})`
          )
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
            if (propertyId) await loadProperty(propertyId);
            navigate(`/chat/${newThread.id}`, { replace: true });
          }
        }
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, threadId, agentProfileId]);

  const loadThreadDetails = async (tId: string) => {
    const { data: thread } = await supabase.from("chat_threads").select("*").eq("id", tId).single();
    if (thread && profile) {
      setThreadStatus((thread as any).status || "restricted");
      const mineIsBuyer = thread.buyer_id === profile.id;
      setIsBuyer(mineIsBuyer);
      const otherId = mineIsBuyer ? thread.agent_id : thread.buyer_id;
      await loadOtherUser(otherId);
      if (thread.property_id) {
        await loadProperty(thread.property_id);
        await loadDeal(thread.property_id, thread.buyer_id);
      }
    }
    setLoading(false);
  };

  const loadOtherUser = async (otherId: string) => {
    const { data } = await (supabase as any)
      .from("public_profiles")
      .select("full_name, avatar_url")
      .eq("id", otherId)
      .maybeSingle();
    setOtherUser({ name: data?.full_name || "Unknown", avatar: data?.avatar_url || null });
  };

  const loadProperty = async (pid: string) => {
    const { data } = await (supabase as any)
      .from("properties")
      .select("id, title, city, state, price, image_url, property_code, status")
      .eq("id", pid)
      .maybeSingle();
    if (data) setProperty(data as ChatProperty);
  };

  const loadDeal = async (pid: string, buyerProfileId: string) => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("deal_requests")
      .select("status")
      .eq("property_id", pid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDealStatus(data?.status ?? null);
  };

  /* ---------------- messages + realtime ---------------- */
  useEffect(() => {
    if (!currentThreadId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", currentThreadId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as BubbleMessage[]);
    };
    loadMessages();

    if (profile) {
      supabase
        .from("messages")
        .update({ seen: true })
        .eq("thread_id", currentThreadId)
        .neq("sender_id", profile.id)
        .eq("seen", false)
        .then();
    }

    const channel = supabase
      .channel(`chat-${currentThreadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${currentThreadId}` },
        (payload) => {
          const newMsg = payload.new as BubbleMessage;
          setMessages((prev) =>
            prev.find((m) => m.id === newMsg.id)
              ? prev
              : [...prev.filter((m) => !(m.pending && m.content === newMsg.content)), newMsg]
          );
          if (profile && newMsg.sender_id !== profile.id) {
            supabase.from("messages").update({ seen: true }).eq("id", newMsg.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${currentThreadId}` },
        (payload) => {
          const updated = payload.new as BubbleMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from && payload.from !== profile?.id) {
          setOtherTyping(true);
          window.setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();

    typingChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [currentThreadId, profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const broadcastTyping = () => {
    typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { from: profile?.id } });
  };

  /* ---------------- sending ---------------- */
  const persist = useCallback(
    async (content: string, optimistic = true) => {
      if (!currentThreadId || !profile) return;
      if (optimistic) {
        setMessages((prev) => [
          ...prev,
          {
            id: `tmp-${Date.now()}`,
            sender_id: profile.id,
            content,
            seen: false,
            created_at: new Date().toISOString(),
            pending: true,
          },
        ]);
      }
      await supabase.from("messages").insert({ thread_id: currentThreadId, sender_id: profile.id, content } as any);
      await supabase
        .from("chat_threads")
        .update({ last_message_at: new Date().toISOString() } as any)
        .eq("id", currentThreadId);
    },
    [currentThreadId, profile]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !currentThreadId || !profile) return;
      if (containsContactInfo(text)) {
        await supabase.from("messages").insert({
          thread_id: currentThreadId,
          sender_id: profile.id,
          content: BLOCKED_MESSAGE,
          is_blocked: true,
        } as any);
        toast.error("Contact sharing is not allowed on this platform.");
        return;
      }
      await persist(text);
    },
    [currentThreadId, profile, persist]
  );

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  }, [input, sendMessage]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setSendingFile(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 25MB`);
          continue;
        }
        const path = await uploadChatFile(user.id, file, file.name);
        await persist(
          encodeAttachment({ kind: fileKind(file.type), path, name: file.name, size: file.size, mime: file.type }),
          false
        );
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSendingFile(false);
    }
  };

  const handleVoice = async (blob: Blob, duration: number) => {
    if (!user) return;
    try {
      const path = await uploadChatFile(user.id, blob, `voice-${Date.now()}.webm`);
      await persist(encodeAttachment({ kind: "voice", path, duration, mime: blob.type }), false);
    } catch (e: any) {
      toast.error(e.message || "Could not send voice note");
    }
  };

  const shareLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => persist(encodeAttachment({ kind: "location", lat: pos.coords.latitude, lng: pos.coords.longitude }), false),
      () => toast.error("Location permission denied")
    );
  };

  const shareProperty = () => {
    if (!property) return;
    persist(encodeAttachment({ kind: "property", propertyId: property.id, text: property.title }), false);
  };

  const shareContact = () => {
    persist(encodeAttachment({ kind: "contact", name: profile?.full_name || "Contact" }), false);
  };

  /* ---------------- secure payment flow ---------------- */
  const canPay = dealStatus === "accepted";

  const handleSecurePayment = async () => {
    if (!property) return;
    if (canPay) {
      navigate(`/secure-payment/${property.id}`);
      return;
    }
    const { error } = await (supabase as any).rpc("request_deal", {
      _property_id: property.id,
      _message: "Buyer requested to proceed with a secure payment from chat.",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDealStatus("pending");
    await persist(
      encodeAttachment({ kind: "system", text: "🔐 Secure payment requested — waiting for agent approval", tone: "payment" }),
      false
    );
    toast.success("Request sent. The agent must approve before payment unlocks.");
  };

  const handleInterested = async () => {
    if (!currentThreadId || !profile) return;
    await supabase.from("chat_threads").update({ status: "active" } as any).eq("id", currentThreadId);
    setThreadStatus("active");
    await persist("🤝 I'm interested in this property! Let's discuss further.", false);

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
    toast.success("Chat is now active! You can type freely (contact sharing still blocked).");
  };

  const isRestricted = threadStatus === "restricted";

  const visible = useMemo(() => {
    const q = msgQuery.trim().toLowerCase();
    const list = q ? messages.filter((m) => m.content.toLowerCase().includes(q)) : messages;
    return list.slice(Math.max(0, list.length - limit));
  }, [messages, msgQuery, limit]);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chat…</div>
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
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col bg-muted/20">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Link to="/messages" aria-label="Back to messages" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {otherUser?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-[hsl(var(--success))]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display font-semibold text-foreground">{otherUser?.name || "Chat"}</h2>
              <p className="flex items-center gap-2 text-xs">
                <span className="text-[hsl(var(--success))]">{otherTyping ? "typing…" : "Online"}</span>
                {isRestricted ? (
                  <span className="flex items-center gap-1 font-medium text-[hsl(var(--warning))]">
                    <ShieldAlert className="h-3 w-3" /> Restricted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-medium text-[hsl(var(--success))]">
                    <Heart className="h-3 w-3" /> Active Deal
                  </span>
                )}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Search in conversation" onClick={() => setShowSearch((v) => !v)}>
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Call (coming soon)" disabled className="hidden sm:inline-flex">
              <Phone className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Conversation menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {property && (
                  <DropdownMenuItem onClick={() => navigate(`/property/${property.id}`)}>View property</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/messages")}>Back to inbox</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/ai-assistant")}>Ask Prop Connect AI</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {showSearch && (
            <div className="container mx-auto max-w-3xl px-4 pb-3">
              <Input
                autoFocus
                value={msgQuery}
                onChange={(e) => setMsgQuery(e.target.value)}
                placeholder="Search in this conversation…"
                className="h-10 rounded-2xl bg-muted"
              />
            </div>
          )}
        </div>

        {/* Property card */}
        {property && (
          <div className="container mx-auto max-w-3xl px-4 pt-3">
            <ChatPropertyCard
              property={property}
              isBuyer={isBuyer}
              canPay={canPay}
              onReserve={() => navigate(`/property/${property.id}`)}
              onSecurePayment={handleSecurePayment}
            />
            {isBuyer && !canPay && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Payment unlocks once the agent approves your request.
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="container mx-auto max-w-3xl space-y-2.5">
            {messages.length > visible.length && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Load earlier messages
                </Button>
              </div>
            )}

            {isRestricted && messages.length === 0 && (
              <div className="mb-2 rounded-2xl border border-border bg-card p-4 text-center">
                <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-[hsl(var(--warning))]" />
                <p className="mb-1 text-sm font-medium text-foreground">AI-Guided Chat</p>
                <p className="text-xs text-muted-foreground">
                  Use the quick options below to start. Contact sharing is permanently blocked.
                </p>
              </div>
            )}

            {messages.length === 0 && !isRestricted && (
              <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
            )}

            {visible.map((msg, i) => {
              const prev = visible[i - 1];
              const dayLabel = new Date(msg.created_at).toDateString();
              const showDay = !prev || new Date(prev.created_at).toDateString() !== dayLabel;
              const today = new Date().toDateString();
              const grouped =
                !showDay &&
                prev?.sender_id === msg.sender_id &&
                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000;

              return (
                <div key={msg.id} className={grouped ? "pt-0.5" : "pt-2 first:pt-0"}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                        {dayLabel === today
                          ? "Today"
                          : new Date(msg.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    mine={msg.sender_id === profile?.id}
                    avatar={otherUser?.avatar}
                    name={otherUser?.name}
                    hideAvatar={grouped}
                  />

                </div>
              );
            })}


            {otherTyping && (
              <div className="flex items-center gap-1 pl-9">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    style={{ animationDelay: `${d}ms` }}
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick options */}
        {isRestricted && (
          <div className="border-t border-border bg-card/60 px-4 py-3">
            <div className="container mx-auto max-w-3xl">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Quick questions:</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {AI_QUICK_OPTIONS.map((opt) => (
                  <Button key={opt} variant="outline" size="sm" className="rounded-full text-xs" onClick={() => sendMessage(opt)}>
                    {opt}
                  </Button>
                ))}
              </div>
              <Button
                onClick={handleInterested}
                size="sm"
                className="w-full gap-2 rounded-full bg-[hsl(var(--success))] font-semibold text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90"
              >
                <Heart className="h-4 w-4" /> I'm Interested in this Property
              </Button>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="sticky bottom-0 border-t border-border bg-card px-4 py-3">
          <div className="container mx-auto flex max-w-3xl items-center gap-2">
            <AttachmentMenu
              disabled={isRestricted || sendingFile}
              hasProperty={!!property}
              onPickFiles={handleFiles}
              onShareLocation={shareLocation}
              onShareProperty={shareProperty}
              onShareContact={shareContact}
            />
            {isRestricted ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                <ShieldAlert className="mr-2 h-4 w-4 text-[hsl(var(--warning))]" />
                Use a quick option or "I'm Interested" to start chatting
              </div>
            ) : (
              <Input
                placeholder="Type a message…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  broadcastTyping();
                }}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="h-11 flex-1 rounded-2xl border-transparent bg-muted focus-visible:border-border"
              />
            )}
            {input.trim() ? (
              <Button
                onClick={send}
                aria-label="Send message"
                className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <VoiceRecorder disabled={isRestricted} onSend={handleVoice} />
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Chat;
