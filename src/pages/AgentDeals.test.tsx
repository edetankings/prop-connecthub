import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ReactNode } from "react";
const state=vi.hoisted(()=>({fail:false,eq:vi.fn(),rpc:vi.fn()}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:{id:"owner-auth"}})}));
vi.mock("@/hooks/useFinancialAvailability",()=>({useFinancialAvailability:()=>({enabled:false,unavailableMessage:"Payments are unavailable"})}));
vi.mock("@/components/AuthenticatedLayout",()=>({default:({children}:{children:ReactNode})=><main aria-label="Dashboard workspace">{children}</main>}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({eq:(column:string,value:string)=>{state.eq(column,value);return {order:()=>Promise.resolve({error:state.fail?{message:"Denied"}:null,data:state.fail?null:[{id:"returned-request",buyer_id:"buyer-auth",property_id:"property-id",status:"pending",created_at:"2026-10-20T10:00:00Z",properties:{title:"Returned property",price:10}}]})};}})}),rpc:state.rpc}}));
import AgentDeals from "./AgentDeals";
beforeEach(()=>{state.fail=false;vi.clearAllMocks();state.rpc.mockResolvedValue({data:[{user_id:"buyer-auth",full_name:"Returned buyer"}],error:null});});
afterEach(cleanup);
const open=()=>render(<HelmetProvider><MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentDeals/></MemoryRouter></HelmetProvider>);
it("keeps owned deals inside the dashboard and financial approval disabled",async()=>{
 open();expect(await screen.findByText("Returned property")).toBeInTheDocument();
 expect(screen.getByRole("main",{name:"Dashboard workspace"})).toBeInTheDocument();
 expect(state.eq).toHaveBeenCalledWith("agent_user_id","owner-auth");
 expect(screen.getByRole("button",{name:"Accept Deal"})).toBeDisabled();
 expect(state.rpc).not.toHaveBeenCalledWith("accept_deal",expect.anything());
});
it("distinguishes a denied read from an empty account and supports retry",async()=>{
 state.fail=true;open();expect(await screen.findByRole("alert")).toHaveTextContent("Deal requests unavailable");
 expect(screen.queryByText("No pending requests right now.")).not.toBeInTheDocument();
 state.fail=false;fireEvent.click(screen.getByRole("button",{name:"Retry deal requests"}));
 expect(await screen.findByText("Returned property")).toBeInTheDocument();
});
