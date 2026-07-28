import { useRef } from "react";
import { Image as ImageIcon, FileText, MapPin, Home, UserRound, Plus, CalendarClock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Props {
  disabled?: boolean;
  hasProperty?: boolean;
  onPickFiles: (files: FileList | null) => void;
  onShareLocation: () => void;
  onShareProperty: () => void;
  onShareContact: () => void;
}

const Row = ({
  icon: Icon,
  label,
  hint,
  tint,
  onClick,
  disabled,
}: {
  icon: any;
  label: string;
  hint?: string;
  tint: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center gap-3 border-b border-border/60 px-1 py-3.5 text-left transition-colors last:border-0 hover:bg-muted/50 disabled:opacity-40"
  >
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </button>
);

export function AttachmentMenu({
  disabled,
  hasProperty,
  onPickFiles,
  onShareLocation,
  onShareProperty,
  onShareContact,
}: Props) {
  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label="Add attachment"
          className="h-10 w-10 shrink-0 rounded-full bg-muted text-foreground hover:bg-muted/80"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8">
        <SheetHeader className="pb-1">
          <SheetTitle className="text-left text-base">Share</SheetTitle>
        </SheetHeader>
        <Row
          icon={ImageIcon}
          label="Photo or Video"
          tint="bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]"
          onClick={() => mediaRef.current?.click()}
        />
        <Row
          icon={FileText}
          label="Document"
          hint="PDF, Word, Excel, PPT"
          tint="bg-primary/10 text-primary"
          onClick={() => docRef.current?.click()}
        />
        <Row
          icon={MapPin}
          label="Location"
          tint="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"
          onClick={onShareLocation}
        />
        <Row
          icon={Home}
          label="Property Card"
          tint="bg-primary/10 text-primary"
          onClick={onShareProperty}
          disabled={!hasProperty}
        />
        <Row
          icon={UserRound}
          label="Contact"
          tint="bg-secondary/15 text-secondary"
          onClick={onShareContact}
        />
        <Row icon={CalendarClock} label="Schedule Inspection" hint="Coming soon" tint="bg-muted text-muted-foreground" disabled />

        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <input
          ref={docRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          multiple
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
      </SheetContent>
    </Sheet>
  );
}
