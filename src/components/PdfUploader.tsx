import { useCallback } from "react";
import { FileText, X } from "lucide-react";
import { toast } from "sonner";

export interface PdfFile {
  file: File;
  id: string;
}

interface PdfUploaderProps {
  files: PdfFile[];
  onChange: (files: PdfFile[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
}

const PdfUploader = ({ files, onChange, maxFiles = 3, maxSizeMb = 20 }: PdfUploaderProps) => {
  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const arr = Array.from(incoming);
      const accepted: PdfFile[] = [];
      for (const f of arr) {
        if (f.type !== "application/pdf") {
          toast.error(`${f.name}: only PDF files allowed`);
          continue;
        }
        if (f.size > maxSizeMb * 1024 * 1024) {
          toast.error(`${f.name}: exceeds ${maxSizeMb}MB limit`);
          continue;
        }
        accepted.push({ file: f, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
      }
      const merged = [...files, ...accepted].slice(0, maxFiles);
      if ([...files, ...accepted].length > maxFiles) {
        toast.error(`Max ${maxFiles} documents allowed`);
      }
      onChange(merged);
    },
    [files, maxFiles, maxSizeMb, onChange]
  );

  const removeFile = (id: string) => onChange(files.filter((f) => f.id !== id));

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center cursor-pointer hover:border-secondary/50 transition-colors">

          <p className="text-sm font-medium text-foreground">Click to upload PDF documents</p>
          <p className="text-xs text-muted-foreground mt-1">
            Land docs, ownership proof, agreement, survey plan · Max {maxFiles} files · {maxSizeMb}MB each
          </p>
        </div>
        <input
          type="file"
          accept="application/pdf"
          multiple
          aria-label="Property documents" className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <FileText className="h-5 w-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button aria-label={`Remove document ${f.file.name}`}
                type="button"
                onClick={() => removeFile(f.id)}
                className="rounded-full p-1 hover:bg-destructive/10 text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PdfUploader;
