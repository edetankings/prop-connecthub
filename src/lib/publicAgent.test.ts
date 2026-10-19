import { expect, it } from "vitest";
import { publicAgent } from "./publicAgent";
it("handles nullable public agent fields without fabricated verification",()=>{
 expect(publicAgent({id:"profile-uuid",full_name:null,kyc_verified:null,trust_score:null})).toMatchObject({id:"profile-uuid",full_name:"Property professional",kyc_verified:false,trust_score:0,completed_transactions:0,is_visible:false});
 expect(publicAgent(null)).toBeNull();expect(publicAgent({id:null})).toBeNull();
});
it("preserves the public profile UUID, identity and verification data",()=>{
 expect(publicAgent({id:"profile-uuid",full_name:"Agent Name",kyc_verified:true,location:"Abuja",is_visible:true})).toMatchObject({id:"profile-uuid",full_name:"Agent Name",kyc_verified:true,location:"Abuja",is_visible:true});
});
