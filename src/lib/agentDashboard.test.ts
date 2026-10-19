import { expect, it } from "vitest";
import { activitySeries, listingBucket } from "./agentDashboard";
it("groups actual statuses without calling unreviewed stock active",()=>{
 expect(listingBucket("available",true)).toBe("Active");expect(listingBucket("available",false)).toBe("Other");
 expect(listingBucket("under_verification",false)).toBe("Under review");expect(listingBucket("sold",true)).toBe("Other");expect(listingBucket("draft",false)).toBe("Draft");
});
it("counts only recorded creations inside the selected period",()=>{
 const data=activitySeries([{created_at:"2026-10-18T12:00:00Z"},{created_at:"2026-09-01T12:00:00Z"},{created_at:"invalid"},{created_at:"2099-01-01T00:00:00Z"}],[{created_at:"2026-10-19T12:00:00Z"}],7,new Date("2026-10-19T10:00:00Z"));
 expect(data.reduce((sum,item)=>sum+item.listings,0)).toBe(1);expect(data.reduce((sum,item)=>sum+item.enquiries,0)).toBe(1);expect(data).toHaveLength(6);
});
