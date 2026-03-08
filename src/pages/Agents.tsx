import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AgentCard from "@/components/AgentCard";
import { supabase } from "@/integrations/supabase/client";

export interface DBAgent {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  trust_score: number;
  kyc_verified: boolean;
  location: string | null;
  bio: string | null;
  properties_listed: number;
  completed_transactions: number;
  is_visible: boolean;
}

const Agents = () => {
  const [agents, setAgents] = useState<DBAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data: agentProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_type", "agent")
        .eq("is_visible", true)
        .order("trust_score", { ascending: false });

      if (agentProfiles && agentProfiles.length > 0) {
        // Get real property counts per agent
        const agentIds = agentProfiles.map((a) => a.id);
        const { data: props } = await supabase
          .from("properties")
          .select("agent_id")
          .in("agent_id", agentIds);

        const countMap: Record<string, number> = {};
        props?.forEach((p) => { countMap[p.agent_id] = (countMap[p.agent_id] || 0) + 1; });

        setAgents(
          agentProfiles.map((a) => ({
            ...(a as DBAgent),
            properties_listed: countMap[a.id] || 0,
          }))
        );
      } else {
        setAgents([]);
      }
      setLoading(false);
    };
    fetchAgents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Verified Agents</h1>
        <p className="mt-1 text-muted-foreground">Trust-scored professionals ready to help</p>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : agents.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No agents registered yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;
