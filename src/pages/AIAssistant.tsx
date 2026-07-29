import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkle, Trash2, ShieldCheck, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getSuggestions } from "@/lib/aiSuggestions";
import propAi from "@/assets/prop-ai.png";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "prop-connect-ai-conversation";


const QUICK_PROMPTS: Record<string, string[]> = {
  buyer: [
    "How does the escrow payment work?",
    "What documents should I check before buying land in Lagos?",
    "Best areas in Abuja for a ₦50M budget?",
    "How do I know an agent is verified?",
  ],
  agent: [
    "Write a listing description for a 3-bedroom flat in Lekki",
    "How do I increase my trust score?",
    "How do withdrawals from escrow work?",
    "Tips to close deals faster",
  ],
  admin: [
    "What are common property fraud signals?",
    "How should I handle an escrow dispute?",
    "What to check during KYC review?",
    "Explain our escrow release flow",
  ],
};

const AIAssistant = () => {
  const { profile, session } = useAuth() as any;
  const navigate = useNavigate();
  const role: "buyer" | "agent" | "admin" =
    profile?.profile_type === "agent" ? "agent" : profile?.profile_type === "admin" ? "admin" : "buyer";


  const [messages, setMessages] = useState<AIMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AIMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      /* storage full — ignore */
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [streaming]);

  const ask = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || streaming) return;

      const userMsg: AIMessage = { id: crypto.randomUUID(), role: "user", content: clean };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setStreaming(true);

      const assistantId = crypto.randomUUID();
      let acc = "";

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prop-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            role,
            userName: profile?.full_name?.split(" ")[0],
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "The assistant is unavailable right now.");
        }

        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                acc += delta;
                setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
              }
            } catch {
              /* partial chunk */
            }
          }
        }

        if (!acc) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: "I couldn't generate a reply. Please try again." } : m
            )
          );
        }
      } catch (e: any) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        toast.error(e.message || "Something went wrong");
      } finally {
        setStreaming(false);
      }
    },
    [messages, profile?.full_name, role, session?.access_token, streaming]
  );

  const clearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const prompts = QUICK_PROMPTS[role];

  const suggestions = useMemo(() => {
    if (streaming || messages.length === 0) return [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    return getSuggestions(lastUser, lastAssistant);
  }, [messages, streaming]);


  return (
    <AuthenticatedLayout>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        {/* Header */}
        <header className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-secondary/10 px-4 py-3">
          <div className="container mx-auto flex max-w-3xl items-center gap-3">
            <img
              src={propAi}
              alt="Prop Connect AI"
              width={512}
              height={512}
              className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card object-contain p-1"
            />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold text-foreground">Prop Connect AI</h1>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-secondary" /> Your private real estate assistant
              </p>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
          </div>
        </header>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="container mx-auto max-w-3xl space-y-5">
            {messages.length === 0 && (
              <div className="py-6 text-center">
                <img
                  src={propAi}
                  alt="Prop Connect AI"
                  width={512}
                  height={512}
                  loading="lazy"
                  className="mx-auto h-20 w-20 object-contain"
                />
                <h2 className="mt-3 font-display text-2xl font-bold text-foreground">
                  Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Ask me anything about properties, prices, documents, verification or secure escrow payments on
                  PROP-CONNECT.
                </p>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-card">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <img
                    src={propAi}
                    alt=""
                    width={512}
                    height={512}
                    loading="lazy"
                    className="h-7 w-7 shrink-0 rounded-lg border border-border bg-card object-contain p-0.5"
                  />
                  <div className="prose prose-sm dark:prose-invert min-w-0 max-w-none flex-1 break-words text-sm text-foreground prose-headings:font-display prose-p:my-2 prose-ul:my-2 prose-strong:text-foreground">
                    {m.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Quick prompts */}
        {messages.length === 0 && (
          <div className="px-4 pb-2">
            <div className="container mx-auto grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => ask(p)}
                  className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm text-foreground transition-colors hover:border-secondary/50 hover:bg-muted/50"
                >
                  <Sparkle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 pb-1">
            <div className="container mx-auto flex max-w-3xl flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => (s.to ? navigate(s.to) : ask(s.ask || s.label))}
                  className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {s.to ? <ArrowUpRight className="h-3.5 w-3.5 text-primary" /> : <Sparkle className="h-3.5 w-3.5 text-secondary" />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Composer */}
        <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Ask Prop Connect AI…"
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                disabled={!input.trim() || streaming}
                onClick={() => ask(input)}
                aria-label="Send message"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Prop Connect AI can make mistakes. Always verify property documents through the platform.
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default AIAssistant;
