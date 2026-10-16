import { useEffect, useState } from "react";
import { Check, CheckCheck, FileText, MapPin, UserRound, ShieldAlert, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoiceNotePlayer } from "./VoiceNotePlayer";
import { resolveSignedUrl } from "@/lib/storageUrl";
import { CHAT_BUCKET, formatBytes, parseAttachment } from "@/lib/chatAttachments";
import { cn } from "@/lib/utils";

export interface BubbleMessage {
  id: string;
  sender_id: string;
  content: string;
  seen: boolean;
  is_blocked?: boolean;
  created_at: string;
  pending?: boolean;
}

interface Props {
  message: BubbleMessage;
  mine: boolean;
  avatar?: string | null;
  name?: string;
  /** hide the avatar when this bubble is grouped under the previous one */
  hideAvatar?: boolean;
}


const SignedMedia = ({ path, name, mime }: { path?: string; name?: string; mime?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setUrl(null);
    setLoading(true);
    resolveSignedUrl(CHAT_BUCKET, path).then((u) => {
      if (active) { setUrl(u); setLoading(false); }
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!loading && !url) return <span role="alert" className="text-xs text-destructive">Unable to load attachment</span>;
  if (mime?.startsWith("image/")) {
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={name || "Shared photo"} loading="lazy" className="max-h-64 rounded-xl object-cover" />
      </a>
    ) : (
      <div className="h-40 w-52 animate-pulse rounded-xl bg-muted" />
    );
  }
  if (mime?.startsWith("video/")) {
    return url ? <video src={url} controls className="max-h-64 rounded-xl" /> : <div className="h-40 w-52 animate-pulse rounded-xl bg-muted" />;
  }
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl bg-background/60 p-2"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name || "Document"}</span>
      </span>
      <Download className="ml-1 h-4 w-4 opacity-60" />
    </a>
  );
};

export function MessageBubble({ message, mine, avatar, name, hideAvatar }: Props) {
  const att = parseAttachment(message.content);
  const blocked = message.is_blocked;
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (att?.kind === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] font-medium text-muted-foreground">
          {att.text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2 animate-fade-in", mine ? "justify-end" : "justify-start")}>
      {!mine &&
        (hideAvatar ? (
          <span className="h-7 w-7 shrink-0" aria-hidden />
        ) : (
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {name?.slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ))}


      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[65%]",
          blocked
            ? "border border-destructive/20 bg-destructive/10 text-destructive"
            : mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-foreground"
        )}
      >
        {blocked && (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold">
            <ShieldAlert className="h-3 w-3" /> Blocked
          </p>
        )}

        {!att && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

        {att?.kind === "voice" && <VoiceNotePlayer path={att.path} duration={att.duration} mine={mine} />}

        {(att?.kind === "image" || att?.kind === "file") && (
          <div className="space-y-1.5">
            <SignedMedia path={att.path} name={att.name} mime={att.mime} />
            {att.kind === "file" && att.size ? (
              <p className={cn("text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {formatBytes(att.size)}
              </p>
            ) : null}
            {att.caption && <p className="whitespace-pre-wrap break-words">{att.caption}</p>}
          </div>
        )}

        {att?.kind === "location" && (
          <a
            href={`https://www.google.com/maps?q=${att.lat},${att.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 underline-offset-2 hover:underline"
          >
            <MapPin className="h-4 w-4" /> Shared location
          </a>
        )}

        {att?.kind === "contact" && (
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            <span className="font-medium">{att.name}</span>
          </div>
        )}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            blocked ? "text-destructive/70" : mine ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {time}
          {mine && !blocked && (message.pending ? <Check className="h-3 w-3 opacity-50" /> : message.seen ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
    </div>
  );
}
