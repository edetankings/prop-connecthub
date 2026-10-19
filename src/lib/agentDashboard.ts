export function listingBucket(status:string,verified:boolean):"Active"|"Under review"|"Rejected"|"Draft"|"Other" {
 if(verified && ["available","for_sale","for_rent"].includes(status))return "Active";
 if(status==="under_verification")return "Under review";
 if(status==="rejected")return "Rejected";
 if(status==="draft")return "Draft";
 return "Other";
}
/** Counts recorded creations, never listing views or estimated performance. */
export function activitySeries(listings:{created_at:string}[],inquiries:{created_at:string}[],days:number,now=new Date()) {
 const end=new Date(now);end.setHours(23,59,59,999);
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-days+1);
 const span=end.getTime()-start.getTime()+1;
 const bins=Array.from({length:6},(_,index)=>({date:new Date(start.getTime()+index*span/6).toLocaleDateString("en-NG",{day:"numeric",month:"short"}),listings:0,enquiries:0}));
 for(const [items,key] of [[listings,"listings"],[inquiries,"enquiries"]] as const) for(const item of items){const time=new Date(item.created_at).getTime();if(!Number.isFinite(time)||time<start.getTime()||time>end.getTime())continue;const index=Math.min(5,Math.floor((time-start.getTime())/span*6));bins[index][key]++;}
 return bins;
}
