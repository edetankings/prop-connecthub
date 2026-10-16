import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("page-container", className)} {...props} />;
}

export function ListingSkeleton() {
  return <div role="status" aria-label="Loading properties" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2].map((key) => <div key={key} aria-hidden="true" className="rounded-2xl border border-border bg-card p-3">
      <div className="premium-skeleton aspect-[4/3]" /><div className="premium-skeleton mt-4 h-5 w-3/4" /><div className="premium-skeleton mb-3 mt-3 h-4 w-1/2" />
    </div>)}
    <span className="sr-only">Loading properties...</span>
  </div>;
}
