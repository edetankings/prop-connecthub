import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Building2, Wallet, TrendingUp, Star, Megaphone, Settings, LayoutDashboard, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrustScoreRing } from "@/components/AgentCard";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { toast } from "sonner";

const BuilderDashboard = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; escrow_balance: number } | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "Builder";

  const deleteProject = async (id: string, status: string) => {
    if (status === "sold" || status === "rented") {
      toast.error("Cannot delete a sold or rented project");
      return;
    }
    if (!confirm("Are you sure you want to delete this project?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("properties").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error("Failed to delete project");
    else {
      toast.success("Project deleted");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    supabase
      .from("properties")
      .select("*")
      .eq("agent_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects(data || []));

    supabase
      .from("wallets")
      .select("balance, escrow_balance")
      .eq("user_id", profile.user_id)
      .maybeSingle()
      .then(({ data }) => setWallet(data));

    supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setAnnouncements(data || []));
  }, [profile?.id]);

  const statusColors: Record<string, string> = {
    available: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
    for_sale: "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]",
    draft: "bg-muted text-muted-foreground",
    under_verification: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
    sold: "bg-muted text-muted-foreground",
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Hello, {firstName}! 🏢</h1>
            <p className="mt-1 text-muted-foreground">Manage your developments and projects</p>
          </div>
          <Link to="/add-property">
            <Button className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
              <Plus className="h-4 w-4" /> Add Project
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Building2 className="mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">{projects.length}</p>
            <p className="text-xs text-muted-foreground">Projects</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <TrendingUp className="mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">{profile?.completed_transactions ?? 0}</p>
            <p className="text-xs text-muted-foreground">Deals Closed</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Star className="mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">{profile?.trust_score ?? 0}</p>
            <p className="text-xs text-muted-foreground">Trust Score</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Wallet className="mb-1 h-5 w-5 text-secondary" />
            <p className="font-display text-2xl font-bold text-foreground">
              ₦{((wallet?.balance ?? 0) / 100).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Wallet</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {profile?.full_name?.[0] || "B"}
                </div>
                <h3 className="mt-3 font-display font-bold text-foreground">{profile?.full_name}</h3>
                <Badge className={`mt-1 ${profile?.kyc_verified ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]" : "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]"}`}>
                  {profile?.kyc_verified ? "Verified Developer" : "Pending KYC"}
                </Badge>
                <div className="mt-3"><TrustScoreRing score={profile?.trust_score ?? 0} /></div>
              </div>
              <div className="space-y-1">
                {[
                  { icon: LayoutDashboard, label: "Dashboard" },
                  { icon: Building2, label: "My Projects", count: projects.length },
                  { icon: MessageCircle, label: "Messages" },
                  { icon: Megaphone, label: "Announcements" },
                  { icon: Wallet, label: "Wallet" },
                  { icon: Settings, label: "Settings" },
                ].map((item) => (
                  <button key={item.label} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <span className="flex items-center gap-2"><item.icon className="h-4 w-4" />{item.label}</span>
                    {item.count !== undefined && <span className="text-xs">{item.count}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Announcements */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-secondary" /> Announcements
              </h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-muted-foreground">No announcements yet.</p>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="rounded-lg bg-muted p-3">
                      <p className="text-xs font-semibold text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/announcements">
                <Button variant="ghost" size="sm" className="w-full mt-2 text-secondary text-xs">View All →</Button>
              </Link>
            </div>
          </div>

          {/* Projects */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">My Developments</h2>
              <Link to="/add-property">
                <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">+ Add Project</Button>
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
                <Building2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground mb-4">List your first development to gain verified exposure</p>
                <Link to="/add-property">
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">+ Add First Project</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
                    <div className="h-36 bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{p.title}</p>
                        <Badge className={`text-xs shrink-0 ${statusColors[p.status] || "bg-muted text-muted-foreground"}`}>
                          {p.status?.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-secondary font-bold">₦{p.price?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1"
                          disabled={deletingId === p.id || p.status === "sold" || p.status === "rented"}
                          onClick={() => deleteProject(p.id, p.status)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === p.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="flex justify-center gap-6 pt-6 border-t border-border md:hidden">
          {[
            { icon: LayoutDashboard, label: "Dashboard" },
            { icon: Plus, label: "Add", to: "/add-property" },
            { icon: Building2, label: "Projects" },
            { icon: MessageCircle, label: "Messages" },
            { icon: Settings, label: "Profile" },
          ].map(({ icon: Icon, label, to }) => (
            <Link key={label} to={to || "#"} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary transition-colors">
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default BuilderDashboard;
