import PropConnectAIIcon from "@/components/PropConnectAIIcon";
import { BarChart3, Building2, CalendarCheck, CreditCard, FileCheck2, Home, LifeBuoy, Megaphone, MessageCircle, Network, ReceiptText, ScrollText, Settings2, ShieldAlert, Users, Wallet, type LucideIcon } from "lucide-react";

export type AdminDestination = { label: string; to: string; icon: LucideIcon; aliases?: string[] };
export const adminNavigation: { label: string; items: AdminDestination[] }[] = [
  { label: "Workspace", items: [
    { label: "Overview", to: "/admin", icon: Home, aliases: ["/admin/overview"] },
    { label: "Users", to: "/admin?view=users", icon: Users },
    { label: "KYC reviews", to: "/admin?view=verification", icon: FileCheck2 },
    { label: "Properties", to: "/admin?view=moderation", icon: Building2, aliases: ["/admin/properties"] },
    { label: "Inspections", to: "/admin/inspections", icon: CalendarCheck, aliases: ["/admin?view=reservations"] },
    { label: "Deal records", to: "/admin/deals", icon: ReceiptText, aliases: ["/admin?view=active-deals"] },
  ] },
  { label: "Communications", items: [
    { label: "Support inbox", to: "/admin?view=support", icon: LifeBuoy },
    { label: "Announcements", to: "/admin?view=announcements", icon: Megaphone },
    { label: "My messages", to: "/messages", icon: MessageCircle },
    { label: "Prop Connect AI", to: "/ai-assistant", icon: PropConnectAIIcon },
  ] },
  { label: "Business", items: [
    { label: "Subscriptions", to: "/admin?view=subscriptions", icon: CreditCard },
    { label: "Referrals & matrix", to: "/admin?view=referrals", icon: Network, aliases: ["/admin?view=matrix"] },
    { label: "Finance records", to: "/admin/secure-payments", icon: Wallet, aliases: ["/admin/withdrawals", "/admin?view=earnings", "/admin?view=withdrawals"] },
    { label: "Disputes", to: "/admin/disputes", icon: ShieldAlert, aliases: ["/admin?view=disputes"] },
  ] },
  { label: "Administration", items: [
    { label: "Audit log", to: "/admin/audit", icon: ScrollText, aliases: ["/admin?view=audit"] },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
    { label: "Platform settings", to: "/admin/feature-management", icon: Settings2 },
  ] },
];

export function isAdminDestination(item: AdminDestination, pathname: string, search: string) {
  if (item.to === "/messages" && pathname.startsWith("/chat/")) return true;
  return [item.to, ...(item.aliases || [])].some(to => {
    const [path, query = ""] = to.split("?");
    return path === pathname && (new URLSearchParams(query).get("view") || "") === (new URLSearchParams(search).get("view") || "");
  });
}
