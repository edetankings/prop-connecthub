import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
type Profile = Tables<"profiles">;
export default function UserDirectory({ profiles, roles, onReview, onVisibility, onChat }: {
  profiles: Profile[]; roles: { user_id: string; role: string }[];
  onReview: (userId: string) => void; onVisibility: (profileId: string, visible: boolean) => void; onChat: (profileId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [verification, setVerification] = useState("all");
  const [selected, setSelected] = useState<Profile | null>(null);
  const shown = useMemo(() => profiles.filter(profile =>
    (!query.trim() || [profile.full_name, profile.location].some(value => value?.toLowerCase().includes(query.trim().toLowerCase()))) &&
    (type === "all" || profile.profile_type === type) && (verification === "all" || profile.kyc_verified === (verification === "verified"))
  ), [profiles, query, type, verification]);
  return <section className="operations-directory"><div className="operations-section-heading"><div><h2>User directory</h2><p>{shown.length} matching returned profiles. Account suspension and Auth delivery status are not available here.</p></div></div>
    <div className="operations-filters"><label>Search profiles<Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or location" /></label><label>Profile category<select value={type} onChange={event => setType(event.target.value)}><option value="all">All categories</option><option value="buyer">Buyer</option><option value="agent">Agent</option><option value="builder">Builder / developer</option></select></label><label>KYC status<select value={verification} onChange={event => setVerification(event.target.value)}><option value="all">All KYC states</option><option value="verified">Verified</option><option value="unverified">Not verified</option></select></label></div>
    <div className="operations-table-wrap"><table className="operations-user-table"><caption className="sr-only">Authorized user profiles</caption><thead><tr><th>Name</th><th>Category / roles</th><th>Verification</th><th>Directory visibility</th><th>Last login</th><th>Actions</th></tr></thead><tbody>{shown.map(profile => <tr key={profile.id}><td data-label="Name"><strong>{profile.full_name || "Unnamed profile"}</strong><small>{profile.location || "Location not recorded"}</small></td><td data-label="Category / roles"><Badge variant="outline">{profile.profile_type}</Badge><small>{roles.filter(role => role.user_id === profile.user_id).map(role => role.role).join(", ") || "No assigned role returned"}</small></td><td data-label="Verification">{profile.kyc_verified ? "Verified" : "Not verified"}</td><td data-label="Directory visibility">{profile.profile_type === "agent" ? profile.is_visible ? "Visible" : "Hidden" : "Not applicable"}</td><td data-label="Last login">{profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "Not recorded"}</td><td data-label="Actions"><div className="operations-actions"><Button size="sm" variant="outline" onClick={() => setSelected(profile)}>Profile details</Button><Button size="sm" variant="outline" onClick={() => onReview(profile.user_id)}>Review verification</Button><Button size="sm" variant="outline" onClick={() => onChat(profile.id)}>Message</Button>{profile.profile_type === "agent" && <Button size="sm" variant="outline" onClick={() => onVisibility(profile.id, profile.is_visible)}>{profile.is_visible ? "Hide directory entry" : "Show directory entry"}</Button>}</div></td></tr>)}</tbody></table>{shown.length === 0 && <div className="buyer-empty"><h3>No profiles match</h3><p>Adjust your search or filters.</p></div>}</div>
    <p className="operations-caption">Account deletion is unavailable pending the existing retention and deletion review. Role assignment is not offered.</p>
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="operations-dialog"><DialogHeader><DialogTitle>{selected?.full_name || "Profile details"}</DialogTitle><DialogDescription>Read-only profile information returned under existing administrator permissions.</DialogDescription></DialogHeader><dl className="operations-details"><dt>Profile category</dt><dd>{selected?.profile_type}</dd><dt>KYC</dt><dd>{selected?.kyc_verified ? "Verified" : "Not verified"}</dd><dt>Trust score</dt><dd>{selected?.trust_score ?? "Not recorded"}</dd><dt>Location</dt><dd>{selected?.location || "Not recorded"}</dd><dt>Joined</dt><dd>{selected?.created_at ? new Date(selected.created_at).toLocaleDateString() : "Not recorded"}</dd></dl></DialogContent></Dialog>
  </section>;
}
