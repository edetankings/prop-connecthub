import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { resolveSignedUrl } from "@/lib/storageUrl";
import { CHAT_BUCKET, formatDuration } from "@/lib/chatAttachments";
import { cn } from "@/lib/utils";

interface Props {
  path?: string;
  localUrl?: string;
  duration?: number;
  mine?: boolean;
}

const BARS = 34;

export function VoiceNotePlayer({ path, localUrl, duration = 0, mine }: Props) {
  const [url, setUrl] = useState<string | null>(localUrl || null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(!localUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setUrl(localUrl || null);
    setPlaying(false);
    setProgress(0);
    setLoading(!localUrl && !!path);
    if (localUrl || !path) return;
    let active = true;
    resolveSignedUrl(CHAT_BUCKET, path).then((u) => {
      if (active) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [path, localUrl]);

  const bars = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => {
        const seed = ((i * 9301 + 49297) % 233280) / 233280;
        return 25 + seed * 75;
      }),
    []
  );

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.playbackRate = speed;
      el.play();
    }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration || !isFinite(el.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct);
  };

  if (!loading && !url) return <span role="alert" className="text-xs text-destructive">Unable to load voice note</span>;

  const played = Math.round(progress * BARS);

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
          mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px]" />
        )}
      </button>

      <div className="flex-1">
        <div className="flex h-7 cursor-pointer items-center gap-[2px]" onClick={seek}>
          {bars.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={cn(
                "w-[2px] rounded-full transition-colors",
                i <= played
                  ? mine
                    ? "bg-primary-foreground"
                    : "bg-primary"
                  : mine
                  ? "bg-primary-foreground/35"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn("text-[11px] tabular-nums", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {formatDuration(duration)}
        </span>
        <button
          type="button"
          onClick={cycleSpeed}
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold",
            mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {speed}x
        </button>
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration && isFinite(el.duration)) setProgress(el.currentTime / el.duration);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
