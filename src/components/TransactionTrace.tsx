import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Field = { label: string; value?: string | null; mono?: boolean };

const TransactionTrace = ({
  transactionId,
  propertyId,
  propertyCode,
  buyerId,
  agentId,
  buyerName,
  agentName,
  compact = false,
}: {
  transactionId?: string | null;
  propertyId?: string | null;
  propertyCode?: string | null;
  buyerId?: string | null;
  agentId?: string | null;
  buyerName?: string | null;
  agentName?: string | null;
  compact?: boolean;
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Could not copy");
    }
  };

  const fields: Field[] = [
    { label: "Property Code", value: propertyCode, mono: true },
    { label: "Transaction ID", value: transactionId, mono: true },
    { label: "Property ID", value: propertyId, mono: true },
    { label: "Buyer ID", value: buyerId ? (buyerName ? `${buyerName} · ${buyerId}` : buyerId) : null, mono: true },
    { label: "Agent ID", value: agentId ? (agentName ? `${agentName} · ${agentId}` : agentId) : null, mono: true },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <details className={`group rounded-lg border bg-muted/40 ${compact ? "px-3 py-1.5" : "px-3 py-2"}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>🔍 Traceability — IDs</span>
        <span className="text-[10px] uppercase tracking-wide opacity-60 group-open:hidden">show</span>
        <span className="hidden text-[10px] uppercase tracking-wide opacity-60 group-open:inline">hide</span>
      </summary>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {fields.map((f) => {
          const key = f.label;
          const raw = (f.value || "").split(" · ").pop() || f.value || "";
          return (
            <button
              type="button"
              key={key}
              onClick={() => copy(key, raw)}
              className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1 text-left text-[11px] transition-colors hover:bg-accent"
              title={`Copy ${key}`}
            >
              <span className="min-w-0">
                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">{f.label}</span>
                <span className={`block truncate text-foreground ${f.mono ? "font-mono" : ""}`}>{f.value}</span>
              </span>
              {copied === key ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
};

export default TransactionTrace;
