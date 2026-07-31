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
    ["BEGINNER", "Beginner"],
    ["INTERMEDIATE", "Intermediate"],
    ["ADVANCED", "Advanced"],
    ["EXPERT", "Expert"],
  ] as const)("renders %s as the readable label %s", (difficulty, label) => {
    render(<DifficultyBadge difficulty={difficulty} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("exposes the difficulty to assistive technology, not just via colour", () => {
    render(<DifficultyBadge difficulty="EXPERT" />);
    expect(screen.getByLabelText("Difficulty: Expert")).toBeInTheDocument();
  });

  it("uses a distinct colour class per tier so tiers are visually separable", () => {
    const { rerender } = render(<DifficultyBadge difficulty="BEGINNER" />);
    const beginner = screen.getByText("Beginner").className;
    rerender(<DifficultyBadge difficulty="EXPERT" />);
    const expert = screen.getByText("Expert").className;
    expect(beginner).not.toEqual(expert);
  });
});
