import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({profiles:[] as Record<string,unknown>[],properties:[] as Record<string,unknown>[],eq:vi.fn()}));
vi.mock("@/components/Navbar",()=>({default:()=>null}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:null,profile:null})}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
 const query={select:()=>query,eq:(key:string,value:unknown)=>{mock.eq(table,key,value);return query;},in:()=>query,order:()=>query,then:(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>Promise.resolve({data:table==="public_profiles"?mock.profiles:mock.properties,error:null}).then(resolve,reject)};
 return query;
}}}));
import Agents from "./Agents";
import Properties from "./Properties";
beforeEach(()=>{vi.clearAllMocks();mock.profiles=[];mock.properties=[];});
afterEach(cleanup);
function open(page:"agents"|"properties") {return render(<HelmetProvider><MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}>{page==="agents"?<Agents/>:<Properties/>}</MemoryRouter></HelmetProvider>);}
it("shows an honest empty agent directory with no demo profile or fabricated location",async()=>{
 open("agents");await screen.findByText("No matching agents.");
 expect(document.querySelectorAll(".agent-market-card")).toHaveLength(0);
 expect(screen.getByLabelText("Location").querySelectorAll("option")).toHaveLength(1);
 expect(screen.queryByText(/Tobi Akin|Design preview|Fictional agency/)).not.toBeInTheDocument();
});
it("shows only returned agent records in the final directory design",async()=>{
 mock.profiles=[{id:"returned-profile",full_name:"Returned professional",profile_type:"agent",kyc_verified:true,trust_score:50,location:"Abuja"}];
 mock.properties=[{agent_id:"returned-profile"}];
 open("agents");await screen.findByRole("heading",{name:"Returned professional"});
 expect(document.querySelectorAll(".agent-market-card")).toHaveLength(1);
 expect(screen.getByRole("link",{name:"View profile"})).toHaveAttribute("href","/agent/returned-profile");
 expect(mock.eq).toHaveBeenCalledWith("properties","is_verified",true);
});
it("shows an empty property search without adding a sample house",async()=>{
 open("properties");await screen.findByText("No properties yet. Check back soon.");
 expect(document.querySelectorAll(".marketplace-card")).toHaveLength(0);
 expect(screen.queryByText(/Sample Garden Duplex|Design preview/)).not.toBeInTheDocument();
 expect(document.querySelector('a[href*="preview-"]')).toBeNull();
});
