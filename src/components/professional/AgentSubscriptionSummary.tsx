import { useCallback } from "react";
import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useBuyerResource } from "@/hooks/useBuyerResource";
import type { Tables } from "@/integrations/supabase/types";
type Subscription = Pick<Tables<"subscriptions">,"user_id"|"status"|"start_date"|"end_date">;
const displayDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?"Not recorded":date.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});};
export default function AgentSubscriptionSummary() {
 const {user,profile,isAdmin}=useAuth();
 const userId=user?.id;
 const allowed=!!userId && profile?.profile_type==="agent" && !isAdmin;
 const resource=useBuyerResource<Subscription>(useCallback(async()=>{
  if(!allowed || !userId)return {data:[],error:null};
  const result=await supabase.from("subscriptions").select("user_id,status,start_date,end_date").eq("user_id",userId).maybeSingle();
  return {data:result.data?[result.data]:[],error:result.error};
 },[allowed,userId]));
 if(!allowed)return null;
 const record=resource.data.find(row=>row.user_id===userId);
 const expired=record?.status==="active" && new Date(record.end_date).getTime()<Date.now();
 return <section className="agent-dashboard-panel agent-subscription-summary" aria-labelledby="agent-subscription-title">
  <div className="agent-panel-heading"><h2 id="agent-subscription-title"><CreditCard aria-hidden="true"/>Your subscription</h2><Link to="/payments">Manage subscription</Link></div>
  {resource.loading?<p role="status">Loading your subscription…</p>:resource.error?<div role="alert"><p>Your subscription could not be loaded.</p><button type="button" onClick={resource.retry}>Retry subscription</button></div>:record?<dl><div><dt>Account status</dt><dd>{expired?"expired":record.status.replace(/_/g," ")}</dd></div><div><dt>Start date</dt><dd>{displayDate(record.start_date)}</dd></div><div><dt>End date</dt><dd>{displayDate(record.end_date)}</dd></div></dl>:<p>No subscription record was returned for your account. Visit subscription management to review your options.</p>}
  <p className="agent-subscription-note">Subscription management remains accessible. Payment availability follows the existing account safeguards.</p>
 </section>;
}
