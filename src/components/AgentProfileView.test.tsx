import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AgentProfileView from "./AgentProfileView";
import type { DBAgent } from "@/pages/Agents";
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:null})}));
afterEach(cleanup);
const agent:DBAgent={id:"real-agent-id",full_name:"Returned Agent",avatar_url:null,trust_score:42,kyc_verified:false,location:"Abuja",bio:"Returned biography.",properties_listed:0,completed_transactions:2,is_visible:false};
it("uses returned agent data without invented verification, listings or reviews",()=>{
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentProfileView agent={agent} properties={[]} reviews={[]} showChat={false}/></MemoryRouter>);
 expect(screen.getByRole("heading",{name:"Returned Agent"})).toBeInTheDocument();
 expect(screen.getByText("Verification pending")).toBeInTheDocument();
 expect(screen.getByText("Returned biography.")).toBeInTheDocument();
 expect(screen.getByText("No reviewed listings available.")).toBeInTheDocument();
 expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
 expect(screen.queryByRole("link",{name:"Contact agent"})).not.toBeInTheDocument();
});
it("preserves the existing authorized chat destination",()=>{
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentProfileView agent={{...agent,kyc_verified:true}} properties={[]} reviews={[]} showChat/></MemoryRouter>);
 expect(screen.getByText("Verified agent")).toBeInTheDocument();
 expect(screen.getByRole("link",{name:"Contact agent"})).toHaveAttribute("href","/chat/new?agent=real-agent-id");
});
