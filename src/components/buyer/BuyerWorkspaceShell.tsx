import type { ReactNode } from "react";
import WorkspaceShell from "@/components/WorkspaceShell";
export default function BuyerWorkspaceShell({ children }: { children: ReactNode }) {
  return <WorkspaceShell role="buyer">{children}</WorkspaceShell>;
}
