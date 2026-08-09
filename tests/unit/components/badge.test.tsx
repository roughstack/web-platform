import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, DifficultyBadge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Storage</Badge>);
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });

  it("merges caller classes over its own defaults", () => {
    render(<Badge className="uppercase">wal</Badge>);
    expect(screen.getByText("wal")).toHaveClass("uppercase");
  });
});

describe("DifficultyBadge", () => {
  it.each([
    ["EASY", "Easy"],
    ["MEDIUM", "Medium"],
    ["HARD", "Hard"],
  ] as const)("renders %s as the readable label %s", (difficulty, label) => {
    render(<DifficultyBadge difficulty={difficulty} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("exposes the difficulty to assistive technology, not just via colour", () => {
    render(<DifficultyBadge difficulty="HARD" />);
    expect(screen.getByLabelText("Difficulty: Hard")).toBeInTheDocument();
  });

  it("uses a distinct colour class per rung so rungs are visually separable", () => {
    const { rerender } = render(<DifficultyBadge difficulty="EASY" />);
    const easy = screen.getByText("Easy").className;
    rerender(<DifficultyBadge difficulty="HARD" />);
    const hard = screen.getByText("Hard").className;
    expect(easy).not.toEqual(hard);
  });
});
