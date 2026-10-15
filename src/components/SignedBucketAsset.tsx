import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { resolveSignedUrl } from "@/lib/storageUrl";

interface Props {
  bucket: string;
  value: string | null | undefined;
  label?: string;
  imgClassName?: string;
}

/**
 * Renders a preview for a file stored in a (private) Supabase bucket.
 * Accepts owned relative object paths; absolute legacy URLs are rejected.
 * Shows an image preview when the file is an image; otherwise a "View" link.
 */
export function SignedBucketAsset({ bucket, value, label = "document", imgClassName }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    resolveSignedUrl(bucket, value || null).then((u) => {
      if (active) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [bucket, value]);

  if (!value) return null;
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </span>
    );
  }
  if (!url) {
    return <span className="text-xs text-destructive">Unable to load {label}</span>;
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={label}
          className={imgClassName || "max-w-[300px] rounded-lg border border-border"}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline inline-flex items-center gap-1"
    >
      <FileText className="h-4 w-4" /> View {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
