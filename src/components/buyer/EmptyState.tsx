import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  to?: string;
}

const EmptyState = ({ icon, title, description, actionLabel, to }: EmptyStateProps) => (
  <div className="animate-fade-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center shadow-card">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      {icon}
    </div>
    <p className="font-display text-base font-semibold text-foreground">{title}</p>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    )}
    {actionLabel && to && (
      <Button asChild size="sm" className="mt-4 rounded-full px-5">
        <Link to={to}>{actionLabel}</Link>
      </Button>
    )}
  </div>
);

export default EmptyState;
