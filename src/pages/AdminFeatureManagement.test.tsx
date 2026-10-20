import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const state=vi.hoisted(()=>({admin:true}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({isAdmin:state.admin})}));
vi.mock("@/components/AuthenticatedLayout",()=>({default:({children}:{children:ReactNode})=><main>{children}</main>}));
import AdminFeatureManagement from "./AdminFeatureManagement";
beforeEach(()=>{state.admin=true;});afterEach(cleanup);
const open=()=>render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AdminFeatureManagement/></MemoryRouter>);
it("shows requested ON defaults as disabled controls and reports unsupported backend instead of records",()=>{
 open();const controls=screen.getAllByRole("switch");expect(controls).toHaveLength(2);for(const control of controls){expect(control).toBeDisabled();expect(control).toHaveAttribute("aria-checked","true");fireEvent.click(control);expect(control).toHaveAttribute("aria-checked","true");}
 expect(screen.getByText("Waitlist backend is not configured")).toBeInTheDocument();expect(screen.queryByText(/@/)).not.toBeInTheDocument();expect(screen.getByRole("link",{name:/Review existing subscription records/})).toHaveAttribute("href","/admin?view=subscriptions");
});
it("exposes no global controls, table or records to a non-administrator",()=>{
 state.admin=false;open();expect(screen.getByRole("alert")).toHaveTextContent("Administrator access is required");expect(screen.queryByRole("switch")).not.toBeInTheDocument();expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
