import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null, update: vi.fn(), insert: vi.fn(), eq: vi.fn(), upload: vi.fn(), success: vi.fn(), error: vi.fn(),
  savedStatus: "draft", saveError: false, savePending: null as Promise<unknown> | null,
  profile: { id: "synthetic-owner", user_id: "synthetic-auth", profile_type: "agent", kyc_verified: true },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: mocks.profile, isAdmin: false, loading: false }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ isAgent: true, isActive: true, loading: false }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/LocationPicker", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const query = { select: () => query, eq: (key: string, value: string) => { mocks.eq(table,key,value); return query; },
      maybeSingle: async () => ({ data: mocks.row, error: null }),
      single: async () => mocks.savePending || ({ data: mocks.saveError ? null : { id: "synthetic-property", status: mocks.savedStatus }, error: mocks.saveError ? { message: "Synthetic update denied" } : null }),
      update: (payload: unknown) => { mocks.update(payload); return query; }, insert: mocks.insert,
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve({ data: [{ id: "private-document" }], error: null }).then(resolve,reject),
    }; return query;
  }, storage: { from: () => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: "https://synthetic.example/new.jpg" } }) }) },
} }));
import AddProperty from "./AddProperty";
beforeEach(() => {
  vi.clearAllMocks(); mocks.savedStatus = "draft"; mocks.saveError = false; mocks.savePending = null;
  mocks.row = { id: "synthetic-property", agent_id: "synthetic-owner", title: "Synthetic owned listing", price: 100, property_type: "house", listing_type: "sale", description: "Synthetic description", city: "Lagos", state: "Lagos", latitude: 6.5, longitude: 3.4, images: ["https://synthetic.example/one.jpg", "https://synthetic.example/two.jpg"], image_url: "https://synthetic.example/one.jpg", videos: ["https://synthetic.example/video.mp4"], amenities: [], is_verified: false, status: "draft" };
});
afterEach(cleanup);
function open() { render(<MemoryRouter initialEntries={["/add-property?edit=synthetic-property"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AddProperty /></MemoryRouter>); }
describe("owned property editing with mocked SDK and no remote writes", () => {
  it("retains media and private documents and scopes updates to the owned record", async () => {
    open();
    await screen.findByRole("heading", { name: "Edit your listing" });
    expect(screen.getByLabelText("Title *")).toHaveValue("Synthetic owned listing");
    expect(screen.getByText("1 existing private documents will be retained.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Synthetic updated title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ title: "Synthetic updated title", images: ["https://synthetic.example/one.jpg", "https://synthetic.example/two.jpg"], videos: ["https://synthetic.example/video.mp4"] }));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("is_verified");
    expect(mocks.eq).toHaveBeenCalledWith("properties", "agent_id", "synthetic-owner");
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("does not claim that an existing listing was saved when its update fails", async () => {
    mocks.saveError = true;
    open(); await screen.findByRole("heading", { name: "Edit your listing" });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Synthetic update denied"));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeEnabled();
    mocks.saveError = false;
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
  });
  it("locks media and field changes while the save is pending", async () => {
    let finish!: (value: unknown) => void;
    mocks.savePending = new Promise(resolve => { finish = resolve; });
    open(); await screen.findByRole("heading", { name: "Edit your listing" });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(screen.getByLabelText("Title *")).toBeDisabled();
    expect(screen.getByLabelText("Property photographs")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove saved photograph 1" })).toBeDisabled();
    finish({ data: { id: "synthetic-property", status: "draft" }, error: null });
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
  });
  it("backs cover selection and removal with the actual saved image references", async () => {
    open(); await screen.findByRole("heading", { name: "Edit your listing" });
    fireEvent.click(screen.getByRole("button", { name: "Use saved photograph 2 as cover" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove saved photograph 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][0].image_url).toBe("https://synthetic.example/two.jpg");
    expect(mocks.update.mock.calls[0][0].images).toEqual(["https://synthetic.example/two.jpg"]);
  });
  it.each(["sold", "rented", "payment_pending", "transaction_in_progress"])("fails closed for %s listings", async status => {
    mocks.row!.status = status; open();
    await screen.findByText("Listing unavailable for editing");
    expect(screen.queryByRole("button", { name: "Save as Draft" })).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("fails closed when an unexpected other owner's record is returned", async () => {
    mocks.row!.agent_id = "another-owner"; open();
    await screen.findByText("Listing unavailable for editing");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("submits changes for review without writing approval fields or claiming publication", async () => {
    mocks.row!.status = "available"; mocks.row!.is_verified = true; mocks.savedStatus = "under_verification";
    open(); await screen.findByRole("heading", { name: "Edit your listing" });
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Property submitted for admin approval!"));
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("status", "under_verification");
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("is_verified");
    expect(mocks.success).not.toHaveBeenCalledWith("Property published!");
  });
});
