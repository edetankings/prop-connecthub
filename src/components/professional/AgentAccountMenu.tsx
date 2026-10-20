import { Link } from "react-router-dom";
import { CreditCard, Heart, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Props = { role?: "agent" | "buyer"; name: string; avatar?: string | null; leaving: boolean; onSignOut: () => void };
export default function AgentAccountMenu({ name, avatar, leaving, onSignOut, role = "agent" }: Props) {
 return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="agent-account-trigger" aria-label="Open account menu">
  {avatar ? <img src={avatar} alt=""/> : <span className="agent-account-initial" aria-hidden="true">{name.trim()[0] || "A"}</span>}
  <span className="agent-account-name"><strong>{name}</strong><small>{role === "buyer" ? "Buyer workspace" : "Agent workspace"}</small></span>
 </button></DropdownMenuTrigger><DropdownMenuContent align="end" sideOffset={10} className="agent-account-dropdown">
  <DropdownMenuLabel><span className="agent-menu-name">{name}</span><span className="agent-menu-caption">Manage your account</span></DropdownMenuLabel><DropdownMenuSeparator/>
  {(role === "buyer" ? [{to:"/settings",label:"Profile & settings",icon:UserRound},{to:"/dashboard/buyer?view=saved",label:"Saved properties",icon:Heart},{to:"/dashboard/buyer?view=transactions",label:"Transaction records",icon:Wallet}] : [{to:"/settings",label:"Profile & settings",icon:UserRound},{to:"/verification",label:"Identity verification",icon:ShieldCheck},{to:"/payments",label:"Subscription & payments",icon:CreditCard},{to:"/earnings",label:"Earnings & referrals",icon:Wallet}]).map(({to,label,icon:Icon})=><DropdownMenuItem key={to} asChild><Link to={to}><Icon aria-hidden="true"/>{label}</Link></DropdownMenuItem>)}
  <DropdownMenuSeparator/><DropdownMenuItem disabled={leaving} onSelect={onSignOut}>{leaving?"Signing out…":"Sign out"}</DropdownMenuItem>
 </DropdownMenuContent></DropdownMenu>;
}
