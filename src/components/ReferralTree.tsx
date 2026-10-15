import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, User as UserIcon, CheckCircle } from "lucide-react";

interface Node {
  id: string;
  full_name: string;
  profile_type: string;
  kyc_verified: boolean;
  created_at: string;
  referral_position: number | null;
  children: Node[];
}

interface Props {
  rootProfileId: string;
  compact?: boolean;
}

const NodeBox = ({ node, level }: { node: Node; level: number }) => {
  const colors = [
    "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30",
    "border-blue-300 bg-blue-50/60 dark:bg-blue-950/30",
    "border-amber-300 bg-amber-50/60 dark:bg-amber-950/30",
  ];
  return (
    <div className={`rounded-lg border-2 ${colors[level - 1] || "border-border bg-card"} p-3 min-w-[180px]`}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <UserIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{node.full_name || "Unnamed"}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{node.profile_type}</Badge>
            {node.kyc_verified && <CheckCircle className="h-3 w-3 text-emerald-600" />}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Joined {new Date(node.created_at).toLocaleDateString()}
      </p>
    </div>
  );
};

const TreeBranch = ({ node, level }: { node: Node; level: number }) => {
  if (level > 3) return null;
  return (
    <div className="flex flex-col items-center">
      <NodeBox node={node} level={level} />
      {node.children.length > 0 && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex gap-3 flex-wrap justify-center">
            {node.children.map((child) => (
              <TreeBranch key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ReferralTree = ({ rootProfileId, compact = false }: Props) => {
  const { isAdmin } = useAuth();
  const [tree, setTree] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ l1: 0, l2: 0, l3: 0, total: 0 });

  useEffect(() => {
    if (!rootProfileId || !isAdmin) { setLoading(false); return; }
    loadTree();
  }, [rootProfileId, isAdmin]);

  const loadTree = async () => {
    setLoading(true);
    const { data: root } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, profile_type, kyc_verified, created_at, referral_position")
      .eq("id", rootProfileId)
      .maybeSingle();

    if (!root) { setLoading(false); return; }

    // Level 1
    const { data: l1 } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, profile_type, kyc_verified, created_at, referral_position")
      .eq("referred_by", rootProfileId)
      .order("referral_position");

    const l1Ids = (l1 || []).map((u: any) => u.id);
    const { data: l2 } = l1Ids.length ? await (supabase as any)
      .from("profiles")
      .select("id, full_name, profile_type, kyc_verified, created_at, referral_position, referred_by")
      .in("referred_by", l1Ids)
      .order("referral_position") : { data: [] };

    const l2Ids = (l2 || []).map((u: any) => u.id);
    const { data: l3 } = l2Ids.length ? await (supabase as any)
      .from("profiles")
      .select("id, full_name, profile_type, kyc_verified, created_at, referral_position, referred_by")
      .in("referred_by", l2Ids)
      .order("referral_position") : { data: [] };

    const buildTree = (parent: any): Node => ({
      ...parent,
      children: (l1 || [])
        .filter((u: any) => parent.id === rootProfileId)
        .map((u: any) => ({
          ...u,
          children: (l2 || [])
            .filter((v: any) => v.referred_by === u.id)
            .map((v: any) => ({
              ...v,
              children: (l3 || [])
                .filter((w: any) => w.referred_by === v.id)
                .map((w: any) => ({ ...w, children: [] })),
            })),
        })),
    });

    setTree(buildTree(root));
    setStats({
      l1: (l1 || []).length,
      l2: (l2 || []).length,
      l3: (l3 || []).length,
      total: (l1 || []).length + (l2 || []).length + (l3 || []).length,
    });
    setLoading(false);
  };

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Your invited members are listed below. Detailed matrix placement is available to administrators.</p>;
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading tree…</div>;
  if (!tree) return <div className="p-8 text-center text-muted-foreground">No data</div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 text-center">
          <p className="font-display text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
        </Card>
        <Card className="p-3 text-center border-emerald-300">
          <p className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">{stats.l1}<span className="text-xs text-muted-foreground">/2</span></p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Level 1</p>
        </Card>
        <Card className="p-3 text-center border-blue-300">
          <p className="font-display text-xl font-bold text-blue-700 dark:text-blue-400">{stats.l2}<span className="text-xs text-muted-foreground">/4</span></p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Level 2</p>
        </Card>
        <Card className="p-3 text-center border-amber-300">
          <p className="font-display text-xl font-bold text-amber-700 dark:text-amber-400">{stats.l3}<span className="text-xs text-muted-foreground">/8</span></p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Level 3</p>
        </Card>
      </div>

      {/* Tree */}
      {!compact && stats.total > 0 && (
        <div className="overflow-x-auto p-4 bg-muted/20 rounded-xl border border-border">
          <div className="flex justify-center min-w-fit">
            <TreeBranch node={tree} level={0} />
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
          <p>No referrals yet. Share your referral link to grow your network!</p>
        </div>
      )}
    </div>
  );
};

export default ReferralTree;
