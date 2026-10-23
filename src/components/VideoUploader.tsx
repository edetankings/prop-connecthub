import { useCallback } from "react";
import { Video, X } from "lucide-react";
import { toast } from "sonner";

export interface VideoFile {
  file: File;
  id: string;
  preview: string;
}

interface Props {
  files: VideoFile[];
  onChange: (files: VideoFile[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

const VideoUploader = ({ files, onChange, maxFiles = 3, maxSizeMb = 100 }: Props) => {
  const handle = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: VideoFile[] = [];
    for (const f of Array.from(incoming)) {
      if (!["video/mp4", "video/webm"].includes(f.type)) {
        toast.error(`${f.name}: choose an MP4 or WebM video`);
        continue;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        toast.error(`${f.name}: exceeds ${maxSizeMb}MB limit`);
        continue;
      }
      accepted.push({ file: f, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, preview: URL.createObjectURL(f) });
    }
    const merged = [...files, ...accepted].slice(0, maxFiles);
    if ([...files, ...accepted].length > maxFiles) toast.error(`Max ${maxFiles} videos allowed`);
    onChange(merged);
  }, [files, maxFiles, maxSizeMb, onChange]);

  const remove = (id: string) => {
    const f = files.find(x => x.id === id);
    if (f) URL.revokeObjectURL(f.preview);
    onChange(files.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center cursor-pointer hover:border-secondary/50 transition-colors">

          <p className="text-sm font-medium text-foreground">Click to upload property videos</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, WebM · Max {maxFiles} videos · {maxSizeMb}MB each</p>
        </div>
        <input type="file" accept="video/mp4,video/webm" multiple aria-label="Property videos" className="sr-only" onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      </label>
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map(v => (
            <div key={v.id} className="relative rounded-lg overflow-hidden border border-border bg-card group">
              <video src={v.preview} className="w-full h-32 object-cover" muted />
              <div className="p-2">
                <p className="text-xs font-medium text-foreground truncate">{v.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(v.file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button type="button" aria-label={`Remove video ${v.file.name}`} onClick={() => remove(v.id)} className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-100 transition-opacity">
                <X className="h-3 w-3" />
              </button>
              <div className="absolute top-1 left-1 rounded-full bg-black/60 p-1">
                <Video className="h-3 w-3 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
