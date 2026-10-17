import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  profile: { profile_type: "buyer", welcome_seen: false, kyc_verified: false },
  user: { id: "synthetic-user" }, update: vi.fn(), eq: vi.fn(), kycStatus: null as string | null,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: mocks.profile, user: mocks.user }) }));
vi.mock("@/hooks/useKYCVerification", () => ({ useKYCVerification: () => ({ kycStatus: mocks.kycStatus, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update: mocks.update }) } }));
import WelcomeModal from "./WelcomeModal";
import VerificationBanner from "./VerificationBanner";
beforeEach(() => { vi.clearAllMocks(); mocks.profile = { profile_type: "buyer", welcome_seen: false, kyc_verified: false }; mocks.kycStatus = null; mocks.update.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockResolvedValue({ error: null }); });
afterEach(cleanup);
function open(component: React.ReactNode) { render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{component}</MemoryRouter>); }
describe("role-specific introduction and existing verification states", () => {
  it("explains local saves and requests for buyers and allows dismissal", async () => {
    open(<WelcomeModal />);
    await screen.findByRole("dialog", { name: "Make yourself at home." });
    expect(screen.getByText(/Favorites are local/)).toBeInTheDocument();
    expect(screen.queryByText(/NIN or BVN/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Explore later" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ welcome_seen: true });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "synthetic-user");
  });
  it.each([["agent", "Your professional journey starts here."], ["builder", "Build your presence, thoughtfully."]])("gives %s its own accurate introduction", async (role, title) => {
    mocks.profile.profile_type = role;
    open(<WelcomeModal />);
    await screen.findByRole("dialog", { name: title });
    expect(screen.getByRole("link", { name: "Verification requirements" })).toHaveAttribute("href", "/verification");
    expect(screen.getByText(/Financial operations remain locked/)).toBeInTheDocument();
    expect(screen.queryByText(/₦10,000|₦50,000/)).not.toBeInTheDocument();
    if (role === "builder") expect(screen.getByText(/not a construction/)).toBeInTheDocument();
  });
  it("does not reopen an already dismissed introduction", () => {
    mocks.profile.welcome_seen = true;
    open(<WelcomeModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it.each([[null, "Complete identity verification"], ["pending", "Identity verification under review"], ["verified", "Identity verified"], ["rejected", "Verification needs your attention"]])("shows the stored %s verification state without assigning it", (status, title) => {
    mocks.kycStatus = status;
    open(<VerificationBanner />);
    expect(screen.getByText(title!)).toBeInTheDocument();
    expect(screen.getByText(/Financial operations remain locked/)).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
