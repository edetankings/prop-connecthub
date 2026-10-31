import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state=vi.hoisted(()=>({admin:true,enabled:true,readError:false,writeError:false,rpc:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{rpc:state.rpc}}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({isAdmin:state.admin})}));
vi.mock("@/components/AuthenticatedLayout",()=>({default:({children}:{children:ReactNode})=><main>{children}</main>}));
import AdminFeatureManagement from "./AdminFeatureManagement";
beforeEach(()=>{
 vi.clearAllMocks();state.admin=true;state.enabled=true;state.readError=false;state.writeError=false;
 state.rpc.mockImplementation(async(name:string,args?:{_enabled:boolean})=>{
  if(name==="get_subscriptions_enabled")return {data:state.readError?null:state.enabled,error:state.readError?{message:"Unavailable"}:null};
  if(state.writeError)return {data:null,error:{message:"Denied"}};
  state.enabled=args!._enabled;return {data:state.enabled,error:null};
 });
});afterEach(cleanup);
const open=()=>render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AdminFeatureManagement/></MemoryRouter>);
it("persists ON and OFF and restores the saved setting after remount",async()=>{
 const view=open();const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());expect(toggle).toHaveAttribute("aria-checked","true");
 fireEvent.click(toggle);await waitFor(()=>expect(toggle).toHaveAttribute("aria-checked","false"));
 expect(state.rpc).toHaveBeenCalledWith("set_subscriptions_enabled",{_enabled:false});
 view.unmount();open();const restored=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(restored).toBeEnabled());expect(restored).toHaveAttribute("aria-checked","false");
 fireEvent.click(restored);await waitFor(()=>expect(restored).toHaveAttribute("aria-checked","true"));
 expect(state.rpc).toHaveBeenCalledWith("set_subscriptions_enabled",{_enabled:true});
 expect(screen.getByRole("switch",{name:"Waitlist ON / OFF"})).toBeDisabled();
});
it("retains the saved value after a denied write and permits retry",async()=>{
 state.writeError=true;open();const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());fireEvent.click(toggle);
 expect(await screen.findByText(/Could not save/)).toBeInTheDocument();expect(toggle).toHaveAttribute("aria-checked","true");
 expect(screen.getByText(/Could not save/)).toHaveTextContent("Denied");
 state.writeError=false;fireEvent.click(toggle);await waitFor(()=>expect(toggle).toHaveAttribute("aria-checked","false"));
});
it("uses the acknowledged save without a second read that can disable the toggle",async()=>{
 open();const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());
 state.readError=true;fireEvent.click(toggle);
 await waitFor(()=>expect(toggle).toHaveAttribute("aria-checked","false"));
 expect(toggle).toBeEnabled();
 expect(state.rpc.mock.calls.filter(([name])=>name==="get_subscriptions_enabled")).toHaveLength(1);
 fireEvent.click(toggle);await waitFor(()=>expect(toggle).toHaveAttribute("aria-checked","true"));
});
it("discards a stale focus refresh after the administrator saves a new value",async()=>{
 open();const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());
 let finishRead!:(value:{data:boolean;error:null})=>void;
 state.rpc.mockImplementationOnce(()=>new Promise(resolve=>{finishRead=resolve;}));
 act(()=>{window.dispatchEvent(new Event("focus"));});
 expect(toggle).toBeEnabled();fireEvent.click(toggle);
 await waitFor(()=>expect(toggle).toHaveAttribute("aria-checked","false"));
 await act(async()=>{finishRead({data:true,error:null});});
 expect(toggle).toHaveAttribute("aria-checked","false");expect(toggle).toBeEnabled();
});
it("disables unavailable settings and retries a failed read",async()=>{
 state.readError=true;open();expect(await screen.findByRole("alert")).toHaveTextContent("Subscription settings could not be loaded");
 expect(screen.getByRole("switch",{name:"Subscriptions ON / OFF"})).toBeDisabled();
 state.readError=false;fireEvent.click(screen.getByRole("button",{name:"Retry subscription setting"}));
 await waitFor(()=>expect(screen.getByRole("switch",{name:"Subscriptions ON / OFF"})).toBeEnabled());
});
it("exposes no global controls, table or records to a non-administrator",()=>{
 state.admin=false;open();expect(screen.getByRole("alert")).toHaveTextContent("Administrator access is required");expect(screen.queryByRole("switch")).not.toBeInTheDocument();expect(screen.queryByRole("table")).not.toBeInTheDocument();
 expect(state.rpc).not.toHaveBeenCalled();
});

it("does not claim success when the server acknowledges the wrong value", async () => {
 open(); const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());
 state.rpc.mockImplementationOnce(async()=>({data:true,error:null}));
 fireEvent.click(toggle);
 expect(await screen.findByText(/server did not confirm the change/i)).toBeInTheDocument();
 expect(toggle).toHaveAttribute("aria-checked","true");
 expect(toggle).toBeEnabled();
});
it("prevents repeated saves while an administrator change is pending", async () => {
 open(); const toggle=screen.getByRole("switch",{name:"Subscriptions ON / OFF"});
 await waitFor(()=>expect(toggle).toBeEnabled());
 let finish!:(value:{data:boolean;error:null})=>void;
 state.rpc.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 fireEvent.click(toggle); fireEvent.click(toggle);
 expect(toggle).toBeDisabled();
 expect(state.rpc.mock.calls.filter(([name])=>name==="set_subscriptions_enabled")).toHaveLength(1);
 await act(async()=>finish({data:false,error:null}));
 expect(toggle).toHaveAttribute("aria-checked","false");
 expect(toggle).toBeEnabled();
});
