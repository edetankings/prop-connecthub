import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { PdfFile } from "@/components/PdfUploader";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn(), update: vi.fn(), document: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  storage: { from: () => ({ upload: mocks.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://media.example/${path}` } }) }) },
  from: (table: string) => table === "property_documents" ? { insert: mocks.document } : {
    insert: mocks.insert, update: mocks.update,
  },
} }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { id: "profile-owner", user_id: "auth-owner", kyc_verified: true }, loading: false, isAdmin: true }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ isActive: true, canList: true, loading: false, isAgent: false }) }));
vi.mock("@/components/AuthenticatedLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/LocationPicker", () => ({ default: () => null }));
vi.mock("@/components/PdfUploader", () => ({ default: ({ onChange }: { onChange: (files: PdfFile[]) => void }) =>
  <input aria-label="Document fixture" type="file" onChange={(e) => onChange(Array.from(e.target.files || []).map((file) => ({ file, id: "fixture" })))} /> }));
import AddProperty from "./AddProperty";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:local-preview"), revokeObjectURL: vi.fn() }));
  const confirmed = () => ({ select: () => ({ single: async () => ({ data: { id: "saved-property", status: "draft" }, error: null }) }) });
  mocks.insert.mockImplementation(confirmed);
  mocks.update.mockImplementation(() => { const scope = { eq: () => scope, select: () => confirmed().select() }; return scope; });
  mocks.document.mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function open() {
  const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AddProperty /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText("e.g. Modern 3-Bedroom Apartment"), { target: { value: "Synthetic draft" } });
  return view;
}
describe("property upload failures and retry (mocked services; no remote writes)", () => {
  it("stops saving on an image error and permits the same file to be retried", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { message: "Upload denied" } }).mockResolvedValue({ error: null });
    const { container } = open();
    fireEvent.change(container.querySelector('input[accept="image/*"]')!, { target: { files: [new File(["image"], "test.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Image upload failed: Upload denied"));
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
    expect(mocks.upload).toHaveBeenCalledTimes(2); expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
  it("retains a confirmed property after a document failure and retries without a second insert", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { message: "Private upload denied" } }).mockResolvedValue({ error: null });
    open();
    fireEvent.change(screen.getByLabelText("Document fixture"), { target: { files: [new File(["pdf"], "test.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("listing was saved but is incomplete")));
    expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.document).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
    expect(mocks.insert).toHaveBeenCalledTimes(1); expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.document.mock.calls[0][0].file_url).toMatch(/^auth-owner\/saved-property\//);
    expect(mocks.document.mock.calls[0][0].file_url).not.toContain("https:");
  });
  it("does not save after an image transport failure and clears the loading state", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("Offline"));
    open();
    fireEvent.change(screen.getByLabelText("Property photographs"), { target: { files: [new File(["image"], "test.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Offline"));
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeEnabled();
  });
  it("reuses a confirmed private upload when document metadata failed", async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.document.mockResolvedValueOnce({ error: { message: "Metadata denied" } }).mockResolvedValue({ error: null });
    open();
    fireEvent.change(screen.getByLabelText("Document fixture"), { target: { files: [new File(["pdf"], "test.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Metadata denied")));
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Draft saved!"));
    expect(mocks.upload).toHaveBeenCalledTimes(1); expect(mocks.document).toHaveBeenCalledTimes(2);
    expect(mocks.document.mock.calls[0][0].file_url).toBe(mocks.document.mock.calls[1][0].file_url);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});
