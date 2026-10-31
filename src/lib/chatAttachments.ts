export const CHAT_BUCKET = "chat-attachments";

export type AttachmentKind =
  | "voice"
  | "image"
  | "file"
  | "location"
  | "contact"
  | "property"
  | "system";

export interface ChatAttachment {
  kind: AttachmentKind;
  /** storage path inside the chat-attachments bucket */
  path?: string;
  name?: string;
  size?: number;
  mime?: string;
  /** voice note duration in seconds */
  duration?: number;
  lat?: number;
  lng?: number;
  propertyId?: string;
  caption?: string;
  /** free-form label used by system / offer / payment messages */
  text?: string;
  tone?: "info" | "success" | "warning" | "payment" | "reservation" | "verification";
}

const PREFIX = "[[pcatt]]";

export const encodeAttachment = (a: ChatAttachment) => `${PREFIX}${JSON.stringify(a)}`;

export const parseAttachment = (content: string): ChatAttachment | null => {
  if (!content?.startsWith(PREFIX)) return null;
  try {
    return JSON.parse(content.slice(PREFIX.length)) as ChatAttachment;
  } catch {
    return null;
  }
};

/** Short human label for conversation-list previews */
export const attachmentPreview = (content: string): string => {
  const a = parseAttachment(content);
  if (!a) return content;
  switch (a.kind) {
    case "voice":
      return "🎤 Voice note";
    case "image":
      return "🖼️ Photo";
    case "file":
      return `📄 ${a.name || "Document"}`;
    case "location":
      return "📍 Location";
    case "contact":
      return `👤 ${a.name || "Contact"}`;
    case "property":
      return "🏠 Property";
    default:
      return a.text || "Update";
  }
};

export const uploadChatFile = async (userId: string, file: Blob, filename: string) => {
  // Pure attachment previews must not initialize authentication or require backend configuration.
  const { supabase } = await import("@/integrations/supabase/client");
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
    contentType: (file as File).type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return path;
};

export const fileKind = (mime: string): AttachmentKind =>
  mime.startsWith("image/") ? "image" : "file";

export const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
