import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HomeFaq from "./HomeFaq";
afterEach(cleanup);
describe("landing FAQ", () => {
  it("shows exactly six questions with one open initially and toggles exclusively", () => {
    render(<HomeFaq />);
    const questions = screen.getAllByRole("button");
    const accordion = within(document.querySelector(".home-faq-accordion")! as HTMLElement);
    expect(questions).toHaveLength(6);
    expect(questions[0]).toHaveAttribute("aria-expanded", "true");
    expect(accordion.getAllByRole("region")).toHaveLength(1);
    fireEvent.click(questions[3]);
    expect(questions[0]).toHaveAttribute("aria-expanded", "false");
    expect(questions[3]).toHaveAttribute("aria-expanded", "true");
    expect(accordion.getAllByRole("region")).toHaveLength(1);
    fireEvent.click(questions[3]);
    expect(accordion.queryAllByRole("region")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "mailto:propconnect0@gmail.com");
  });
  it("connects accessible panels and supports keyboard focus movement", () => {
    render(<HomeFaq />);
    const questions = screen.getAllByRole("button");
    questions[0].focus();
    fireEvent.keyDown(questions[0], { key: "ArrowDown" }); expect(questions[1]).toHaveFocus();
    fireEvent.keyDown(questions[1], { key: "End" }); expect(questions[5]).toHaveFocus();
    fireEvent.keyDown(questions[5], { key: "ArrowDown" }); expect(questions[0]).toHaveFocus();
    fireEvent.keyDown(questions[0], { key: "ArrowUp" }); expect(questions[5]).toHaveFocus();
    fireEvent.keyDown(questions[5], { key: "Home" }); expect(questions[0]).toHaveFocus();
    for (const question of questions) {
      const panel = document.getElementById(question.getAttribute("aria-controls")!);
      expect(panel).toHaveAttribute("aria-labelledby", question.id);
    }
  });
});
