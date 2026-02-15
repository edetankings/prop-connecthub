import { Users, ShieldCheck, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { platformStats, formatPrice } from "@/lib/mockData";

const statCards = [
  { label: "Total Users", value: platformStats.totalUsers.toLocaleString(), icon: Users, color: "text-info" },
  { label: "Verified Agents", value: platformStats.verifiedAgents.toString(), icon: ShieldCheck, color: "text-success" },
  { label: "Completed Transactions", value: platformStats.completedTransactions.toLocaleString(), icon: TrendingUp, color: "text-secondary" },
  { label: "Escrow Success Rate", value: `${platformStats.escrowSuccessRate}%`, icon: ShieldCheck, color: "text-success" },
  { label: "Total Revenue", value: formatPrice(platformStats.totalRevenue), icon: DollarSign, color: "text-secondary" },
  { label: "Active Disputes", value: platformStats.activeDisputes.toString(), icon: AlertTriangle, color: "text-destructive" },
];

const trustDistribution = [
  { range: "80-100 (Trusted)", count: 145, pct: 42 },
  { range: "50-79 (Verified)", count: 132, pct: 39 },
  { range: "25-49 (New)", count: 52, pct: 15 },
  { range: "0-24 (Restricted)", count: 13, pct: 4 },
];

const Analytics = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Platform Analytics</h1>
      <p className="mt-1 text-muted-foreground">Real-time platform performance metrics</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <s.icon className={`mb-2 h-6 w-6 ${s.color}`} />
            <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-foreground">Trust Score Distribution</h2>
        <div className="mt-4 space-y-3">
          {trustDistribution.map((t) => (
            <div key={t.range}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-foreground">{t.range}</span>
                <span className="text-muted-foreground">{t.count} agents ({t.pct}%)</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-secondary" />
          <h2 className="font-display text-xl font-bold text-foreground">Monthly Highlights</h2>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div><p className="text-3xl font-bold text-foreground">₦450M</p><p className="text-sm text-muted-foreground">Transaction Volume (Feb)</p></div>
          <div><p className="text-3xl font-bold text-foreground">28</p><p className="text-sm text-muted-foreground">New Verified Agents</p></div>
          <div><p className="text-3xl font-bold text-foreground">96%</p><p className="text-sm text-muted-foreground">Customer Satisfaction</p></div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Analytics;
