import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({recordUser:"owner-auth",role:"agent",isAdmin:false,fail:false,from:vi.fn(),eq:vi.fn()}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:{id:"owner-auth"},profile:{profile_type:state.role},isAdmin:state.isAdmin})}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:state.from}}));
import AgentSubscriptionSummary from "./AgentSubscriptionSummary";
beforeEach(()=>{vi.clearAllMocks();state.recordUser="owner-auth";state.role="agent";state.isAdmin=false;state.fail=false;state.from.mockImplementation(()=>({select:()=>({eq:(key:string,id:string)=>{state.eq(key,id);return {maybeSingle:()=>Promise.resolve({data:state.fail?null:{user_id:state.recordUser,status:"active",start_date:"2098-01-01",end_date:"2099-01-01"},error:state.fail?{message:"Denied"}:null})};}})}));});
afterEach(cleanup);
const open=()=>render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentSubscriptionSummary/></MemoryRouter>);
it("reads only the authenticated agent subscription and exposes the existing management route",async()=>{
 open();expect(await screen.findByText("active")).toBeInTheDocument();expect(state.from).toHaveBeenCalledWith("subscriptions");expect(state.eq).toHaveBeenCalledWith("user_id","owner-auth");expect(screen.getByRole("link",{name:"Manage subscription"})).toHaveAttribute("href","/payments");expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});
it("does not query subscriptions or expose platform controls for a buyer",async()=>{state.role="buyer";await act(async()=>{open();});expect(state.from).not.toHaveBeenCalled();expect(screen.queryByRole("heading")).not.toBeInTheDocument();});
it("reports failed reads without claiming an expired or inactive subscription",async()=>{
 state.fail=true;open();expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");expect(screen.queryByText("expired")).not.toBeInTheDocument();state.fail=false;fireEvent.click(screen.getByRole("button",{name:"Retry subscription"}));expect(await screen.findByText("active")).toBeInTheDocument();
});

it("does not display a subscription returned for a different account",async()=>{state.recordUser="other-auth";open();expect(await screen.findByText(/No subscription record was returned/)).toBeInTheDocument();expect(screen.queryByText("active")).not.toBeInTheDocument();});
