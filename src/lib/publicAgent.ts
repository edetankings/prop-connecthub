import type { DBAgent } from "@/pages/Agents";
type PublicAgentRecord = { [K in keyof DBAgent]?: DBAgent[K] | null };
/** Normalize nullable public-view fields without inventing credentials or reviews. */
export function publicAgent(record: PublicAgentRecord | null | undefined): DBAgent | null {
 if (!record?.id) return null;
 return { id:record.id,full_name:record.full_name?.trim() || "Property professional",avatar_url:record.avatar_url || null,trust_score:record.trust_score ?? 0,kyc_verified:record.kyc_verified === true,location:record.location || null,bio:record.bio || null,properties_listed:record.properties_listed ?? 0,completed_transactions:record.completed_transactions ?? 0,is_visible:record.is_visible === true };
}
