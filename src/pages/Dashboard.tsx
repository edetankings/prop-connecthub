import { Link } from "react-router-dom";
import { Building, MessageCircle, ShieldCheck, TrendingUp, Star, AlertTriangle, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TrustScoreRing } from "@/components/AgentCard";
import PropertyCard from "@/components/PropertyCard";
import { agents, properties } from "@/lib/mockData";

const agent = agents[0];
const agentProperties = properties.filter((p) => p.agentId === agent.id);

const sidebarItems = [
  { icon: Building, label: "My Listings", count: agentProperties.length },
  { icon: MessageCircle, label: "Messages", count: 4 },
  { icon: ShieldCheck, label: "Verification", badge: "9/10" },
  { icon: Star, label: "Reviews", count: agent.reviewCount },
  { icon: TrendingUp, label: "Analytics" },
  { icon: AlertTriangle, label: "Disputes", count: 0 },
  { icon: FileText, label: "Code of Conduct" },
  { icon: Settings, label: "Settings" },
];

const Dashboard = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-col items-center text-center">
              <img src={agent.avatar} alt={agent.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
              <h2 className="mt-3 font-display text-lg font-bold text-foreground">{agent.name}</h2>
              <Badge className="mt-1 bg-success/10 text-success">Fully Verified</Badge>
              <div className="mt-3"><TrustScoreRing score={agent.trustScore} /></div>
            </div>
            <div className="mt-4 space-y-1">
              {sidebarItems.map((item) => (
                <button key={item.label} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <span className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.label}</span>
                  {item.count !== undefined && <span className="text-xs">{item.count}</span>}
                  {item.badge && <Badge variant="outline" className="text-xs">{item.badge}</Badge>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="lg:col-span-3">
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Properties</p>
              <p className="font-display text-2xl font-bold text-foreground">{agent.propertiesListed}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Completed Deals</p>
              <p className="font-display text-2xl font-bold text-foreground">{agent.completedTransactions}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="font-display text-2xl font-bold text-foreground">{agent.rating}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Trust Score</p>
              <p className="font-display text-2xl font-bold text-foreground">{agent.trustScore}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-foreground">My Listings</h2>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">+ Add Property</Button>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {agentProperties.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Dashboard;
