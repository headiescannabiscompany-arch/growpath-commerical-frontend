import React from "react";
import { render } from "@testing-library/react-native";

import { AIResultCard } from "../../src/features/ai/components/AIResultCard";

describe("AIResultCard", () => {
  it("surfaces nested backend result summaries", () => {
    const screen = render(
      <AIResultCard
        title="EC Result"
        data={{
          result: {
            status: "adjust",
            confidence: 0.74,
            recommendation: "Increase EC gradually."
          }
        }}
      />
    );

    expect(screen.getByText("Status: adjust")).toBeTruthy();
    expect(screen.getByText("Confidence: 0.74")).toBeTruthy();
    expect(screen.getByText("Increase EC gradually.")).toBeTruthy();
  });

  it("renders persisted writes without mojibake", () => {
    const screen = render(
      <AIResultCard
        data={{
          result: { status: "stable" },
          writes: [{ type: "Task", id: "task-1" }]
        }}
      />
    );

    expect(screen.getByText("- Task: task-1")).toBeTruthy();
  });
});
