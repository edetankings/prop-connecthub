import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({admin:true}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({isAdmin:state.admin})}));
import WaitlistAnnouncementComposer from "./WaitlistAnnouncementComposer";
beforeEach(()=>{state.admin=true;});afterEach(cleanup);
it("designs the preview while sending remains explicitly unavailable",()=>{
 render(<WaitlistAnnouncementComposer/>);
 fireEvent.change(screen.getByLabelText("Email subject"),{target:{value:"Waitlist news"}});
 fireEvent.change(screen.getByLabelText("Email headline"),{target:{value:"Our next chapter"}});
 fireEvent.change(screen.getByLabelText("Message"),{target:{value:"A real announcement."}});
 expect(screen.getByTitle("Waitlist email preview")).toHaveAttribute("srcdoc",expect.stringContaining("Our next chapter"));
 expect(screen.getByTitle("Waitlist email preview")).toHaveAttribute("sandbox","");
 expect(screen.getByRole("button",{name:"Send to waitlist"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Preview size"),{target:{value:"mobile"}});
 expect(screen.getByTitle("Waitlist email preview").parentElement).toHaveAttribute("data-size","mobile");
});
it("validates the draft before attempting an export",()=>{
 render(<WaitlistAnnouncementComposer/>);fireEvent.click(screen.getByRole("button",{name:"Download email HTML"}));expect(screen.getByRole("status")).toHaveTextContent("Add a subject, headline and message");
});
it("does not expose the composer to non-administrators",()=>{state.admin=false;render(<WaitlistAnnouncementComposer/>);expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();expect(screen.queryByRole("button")).not.toBeInTheDocument();});
