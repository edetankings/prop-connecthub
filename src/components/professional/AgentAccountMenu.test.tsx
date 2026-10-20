import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import AgentAccountMenu from "./AgentAccountMenu";
afterEach(cleanup);
it("opens with the keyboard and links to existing subscription and earnings pages", async () => {
 const logout=vi.fn();
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentAccountMenu name="Agent Ada" leaving={false} onSignOut={logout}/></MemoryRouter>);
 fireEvent.keyDown(screen.getByRole("button",{name:"Open account menu"}),{key:"ArrowDown"});
 expect(await screen.findByRole("menuitem",{name:"Subscription & payments"})).toHaveAttribute("href","/payments");
 expect(screen.getByRole("menuitem",{name:"Earnings & referrals"})).toHaveAttribute("href","/earnings");
 fireEvent.click(screen.getByRole("menuitem",{name:"Sign out"}));
 expect(logout).toHaveBeenCalledTimes(1);
});

it("keeps the buyer account menu specific to buyer records", async () => {
 render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><AgentAccountMenu role="buyer" name="Buyer Ada" leaving={false} onSignOut={vi.fn()}/></MemoryRouter>);
 fireEvent.keyDown(screen.getByRole("button",{name:"Open account menu"}),{key:"ArrowDown"});
 expect(await screen.findByRole("menuitem",{name:"Saved properties"})).toHaveAttribute("href","/dashboard/buyer?view=saved");
 expect(screen.getByRole("menuitem",{name:"Transaction records"})).toHaveAttribute("href","/dashboard/buyer?view=transactions");
 expect(screen.queryByRole("menuitem",{name:"Subscription & payments"})).not.toBeInTheDocument();
 expect(screen.queryByRole("menuitem",{name:"Earnings & referrals"})).not.toBeInTheDocument();
});
