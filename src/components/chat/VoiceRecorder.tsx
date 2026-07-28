import { useEffect, useRef, useState } from "react";
import { Mic, Trash2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceNotePlayer } from "./VoiceNotePlayer";
import { formatDuration } from "@/lib/chatAttachments";
import { toast } from "sonner";

interface Props {
  disabled?: boolean;
  onSend: (blob: Blob, duration: number) => Promise<void> | void;
}

/** WhatsApp-style recorder: record → preview → delete or send. Upload happens only on Send. */
export function VoiceRecorder({ disabled, onSend }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [sending, setSending] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setPreview({ blob, url: URL.createObjectURL(blob), duration: elapsedRef.current });
        setRecording(false);
        setElapsed(0);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= 60) stop();
      }, 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const elapsedRef = useRef(0);

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  };

  const discard = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const send = async () => {
    if (!preview) return;
    setSending(true);
    try {
      await onSend(preview.blob, preview.duration);
      discard();
    } finally {
      setSending(false);
    }
  };

  if (preview) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2">
        <Button type="button" size="icon" variant="ghost" onClick={discard} aria-label="Delete voice note">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <div className="flex-1">
          <VoiceNotePlayer localUrl={preview.url} duration={preview.duration} />
        </div>
        <Button type="button" size="icon" onClick={send} disabled={sending} aria-label="Send voice note" className="rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
        <span className="text-sm font-medium tabular-nums text-foreground">{formatDuration(elapsed)}</span>
        <span className="text-xs text-muted-foreground">Recording… (max 60s)</span>
        <div className="flex-1" />
        <Button type="button" size="icon" onClick={stop} aria-label="Stop recording" className="rounded-full">
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      disabled={disabled}
      onClick={start}
      aria-label="Record voice note"
      className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
