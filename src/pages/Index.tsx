import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Shield, TrendingUp, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import AgentCard from "@/components/AgentCard";
import { properties, agents, platformStats } from "@/lib/mockData";
import heroBg from "@/assets/hero-bg.jpg";

const stats = [
  { label: "Total Users", value: platformStats.totalUsers.toLocaleString(), icon: Users },
  { label: "Verified Agents", value: platformStats.verifiedAgents.toString(), icon: Shield },
  { label: "Completed Deals", value: platformStats.completedTransactions.toLocaleString(), icon: TrendingUp },
  { label: "Escrow Success", value: `${platformStats.escrowSuccessRate}%`, icon: Shield },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero opacity-85" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
              Find & Secure Properties <span className="text-gradient-gold">With Trust</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 md:text-xl">
              Nigeria's most secure property marketplace — escrow-powered, trust-scored, and fully verified agents.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/properties">
                <Button size="lg" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 sm:w-auto">
                  <Search className="h-5 w-5" /> Browse Properties
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                  Become an Agent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="-mt-8 relative z-10 container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4 shadow-card animate-count-up" style={{ animationDelay: `${i * 100}ms` }}>
              <stat.icon className="mb-2 h-5 w-5 text-secondary" />
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Featured Properties</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked by verified agents</p>
          </div>
          <Link to="/properties">
            <Button variant="ghost" className="text-secondary hover:text-secondary/80">View All →</Button>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.slice(0, 3).map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* Top Agents */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Trusted Agents</h2>
              <p className="mt-1 text-muted-foreground">Verified professionals you can count on</p>
            </div>
            <Link to="/agents">
              <Button variant="ghost" className="text-secondary hover:text-secondary/80">View All →</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {agents.slice(0, 2).map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl bg-gradient-hero p-8 text-center md:p-16">
          <Shield className="mx-auto mb-4 h-12 w-12 text-secondary" />
          <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">Your Security Is Our Priority</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Every transaction is protected by our escrow system. Every agent is verified through a 10-step KYC process. Your money is safe with Prop Connect.
          </p>
          <Link to="/register">
            <Button size="lg" className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90">Get Started Free</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
