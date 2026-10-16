import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const state = vi.hoisted(() => ({ session: null as object | null, loading: false, isAdmin: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state }));
import { AdminRoute, ProtectedRoute } from "./ProtectedRoute";

function open(admin = false) {
  const guard = admin ? <AdminRoute><span>protected-content</span></AdminRoute> : <ProtectedRoute><span>protected-content</span></ProtectedRoute>;
  return render(<MemoryRouter initialEntries={["/private"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/private" element={guard} />
      <Route path="/login" element={<span>login-screen</span>} />
      <Route path="/" element={<span>public-screen</span>} />
    </Routes>
  </MemoryRouter>);
}
afterEach(() => { cleanup(); state.session = null; state.loading = false; state.isAdmin = false; });
describe("direct URL access boundaries (mocked Auth state, no live authorization claim)", () => {
  it("redirects unauthenticated visitors from protected content to login", () => {
    open(); expect(screen.getByText("login-screen")).toBeInTheDocument(); expect(screen.queryByText("protected-content")).not.toBeInTheDocument();
  });
  it("redirects unauthenticated visitors from administrator content to login", () => {
    open(true); expect(screen.getByText("login-screen")).toBeInTheDocument();
  });
  it("does not reveal protected content before session initialization completes", () => {
    state.loading = true; open(); expect(screen.queryByText("protected-content")).not.toBeInTheDocument(); expect(screen.queryByText("login-screen")).not.toBeInTheDocument();
  });
  it("allows an authenticated user into ordinary protected content", () => {
    state.session = {}; open(); expect(screen.getByText("protected-content")).toBeInTheDocument();
  });
  it("denies direct administrator URL access to an ordinary authenticated user", () => {
    state.session = {}; open(true); expect(screen.getByText("public-screen")).toBeInTheDocument(); expect(screen.queryByText("protected-content")).not.toBeInTheDocument();
  });
  it("allows an administrator only after authorization state is ready", () => {
    state.session = {}; state.isAdmin = true; open(true); expect(screen.getByText("protected-content")).toBeInTheDocument();
  });
});
