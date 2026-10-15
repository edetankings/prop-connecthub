import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: { user: { id: "test-account" } as { id: string } | null } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
import { useFinancialAvailability } from "./useFinancialAvailability";

describe("financial availability", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.user = { id: "test-account" }; });
  it("stays disabled when the backend rejects configuration", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Financial rules require approval" } });
    const { result } = renderHook(() => useFinancialAvailability());
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_company_payment_details"));
    expect(result.current.enabled).toBe(false);
    expect(result.current.details).toBeNull();
    expect(result.current.unavailableMessage).toContain("Do not transfer funds");
  });
  it("shows only payment details returned by the gated backend", async () => {
    const details = { company_bank_name: "TEST ONLY", company_account_name: "TEST ONLY", company_account_number: "TEST ONLY" };
    mocks.rpc.mockResolvedValue({ data: [details], error: null });
    const { result, rerender } = renderHook(() => useFinancialAvailability());
    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.details).toEqual(details);
    mocks.auth.user = null;
    rerender();
    await waitFor(() => expect(result.current.enabled).toBe(false));
  });
});
