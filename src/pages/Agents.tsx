import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentCard from "@/components/AgentCard";
import { agents } from "@/lib/mockData";

const Agents = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-foreground">Verified Agents</h1>
      <p className="mt-1 text-muted-foreground">Trust-scored professionals ready to help</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {agents.map((a) => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
    <Footer />
  </div>
);

export default Agents;
