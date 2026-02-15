import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, CheckCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import { agents, mockMessages, type Message } from "@/lib/mockData";

const Chat = () => {
  const { agentId } = useParams();
  const agent = agents.find((a) => a.id === agentId);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: `m${Date.now()}`, senderId: "buyer", text: input.trim(), timestamp: new Date().toISOString(), seen: false }]);
    setInput("");
  };

  if (!agent) return <div className="flex min-h-screen items-center justify-center"><p>Agent not found</p></div>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <Link to={`/agent/${agent.id}`} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <img src={agent.avatar} alt={agent.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-border" />
            <div>
              <h2 className="font-display font-semibold text-foreground">{agent.name}</h2>
              <p className="text-xs text-success">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="container mx-auto max-w-2xl space-y-3">
            {messages.map((msg) => {
              const isMine = msg.senderId === "buyer";
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-sm ${
                    isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"
                  }`}>
                    <p>{msg.text}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {isMine && (msg.seen ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
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
            <Button onClick={send} className="bg-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
