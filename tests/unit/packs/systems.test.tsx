import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlowDiagram, StateDiagram, TimelineDiagram } from "@/packs/systems/illustrations";

describe("systems illustrations", () => {
  it("renders a labeled flow without relying on color for order", () => {
    render(
      <FlowDiagram
        label="Request path"
        nodes={[{ label: "Request" }, { label: "Cache", tone: "signal" }]}
        edges={["lookup"]}
      />,
    );

    expect(screen.getByRole("img", { name: "Request path" })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("lookup")).toBeInTheDocument();
  });

  it("renders state transitions and timeline finalization as text", () => {
    const { rerender } = render(
      <StateDiagram states={[{ label: "Ready" }, { label: "Leased" }]} transitions={["lease"]} />,
    );
    expect(screen.getByText("lease")).toBeInTheDocument();

    rerender(
      <TimelineDiagram
        windows={[{ label: "Window A", range: "[0, 10)", finalized: true, events: [] }]}
        watermark="10"
      />,
    );
    expect(screen.getByText("Finalized and evicted")).toBeInTheDocument();
    expect(screen.getByText("Watermark 10")).toBeInTheDocument();
  });

  it("fails quietly when diagram data is malformed", () => {
    render(<FlowDiagram nodes={[{ label: "Only one" }]} />);
    expect(screen.getByText("Diagram data is unavailable.")).toBeInTheDocument();
  });
});
