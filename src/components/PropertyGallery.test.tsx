import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PropertyGallery from "./PropertyGallery";

afterEach(cleanup);
describe("property photograph navigation", () => {
  it("opens the chosen image, navigates with keys and buttons, and closes with Escape", async () => {
    render(<PropertyGallery title="Synthetic test home" images={["/one.jpg", "/two.jpg"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Expand photograph 2" }));
    const dialog = screen.getByRole("dialog", { name: "Synthetic test home photographs" });
    expect(screen.getByAltText("Synthetic test home - expanded photograph 2")).toHaveAttribute("src", "/two.jpg");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByAltText("Synthetic test home - expanded photograph 1")).toHaveAttribute("src", "/one.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Previous expanded photograph" }));
    expect(screen.getByAltText("Synthetic test home - expanded photograph 2")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("uses a neutral fallback when photos are missing or fail", () => {
    const { rerender } = render(<PropertyGallery title="Synthetic test home" images={[]} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/placeholder.svg");
    expect(screen.queryByRole("button", { name: "Next photograph" })).not.toBeInTheDocument();
    rerender(<PropertyGallery title="Synthetic test home" images={["/broken.jpg"]} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/placeholder.svg");
  });
});
