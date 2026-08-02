import React from "react";
import { render } from "@testing-library/react-native";

import {
  AIResultCard,
  createAIResultCardStyles
} from "../../src/features/ai/components/AIResultCard";
import { getThemePalette } from "../../src/theme/appTheme";

describe("AIResultCard", () => {
  it.each([
    ["day" as const, "light" as const],
    ["night" as const, "dark" as const]
  ])("uses the %s palette for result surfaces and copy", (mode, systemScheme) => {
    const palette = getThemePalette(mode, systemScheme);
    const styles = createAIResultCardStyles(palette);

    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.h2.color).toBe(palette.text);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.reco.color).toBe(palette.textSoft);
    expect(styles.sep.backgroundColor).toBe(palette.border);
    expect(styles.mono.color).toBe(palette.textSoft);
  });

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
