import fs from "node:fs";
import path from "node:path";

import { createCommercialDashboardStyles } from "@/app/home/commercial";
import { createCommercialInventoryCreateStyles } from "@/app/home/commercial/inventory-create";
import { createCommercialInventoryItemDetailStyles } from "@/app/home/commercial/inventory-item/[id]";
import { createCommercialProfileStyles } from "@/app/home/commercial/profile";
import { createCommercialTasksStyles } from "@/app/home/commercial/tasks";
import { createCommercialDashboardScreenStyles } from "@/screens/commercial/CommercialDashboardScreen";
import { createCommercialOrdersStyles } from "@/screens/commercial/OrdersScreen";
import { getThemePalette } from "@/theme/appTheme";

const ROUTE_FILES = [
  "src/screens/commercial/OrdersScreen.tsx",
  "src/screens/commercial/CommercialDashboardScreen.js",
  "src/app/home/commercial/index.tsx",
  "src/app/home/commercial/tasks.tsx",
  "src/app/home/commercial/profile.tsx",
  "src/app/home/commercial/inventory-create.tsx",
  "src/app/home/commercial/inventory-item/[id].tsx"
];

describe("commercial operations Night theme", () => {
  const palette = getThemePalette("night", "dark");

  it("themes order summaries, statuses, actions, feedback, and focused records", () => {
    const styles = createCommercialOrdersStyles(palette);

    expect(styles.headerTitle.color).toBe(palette.text);
    expect(styles.headerSubtitle.color).toBe(palette.textMuted);
    expect(styles.feedback).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.success,
        color: palette.success
      })
    );
    expect(styles.summaryCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.statusPill).toEqual(
      expect.objectContaining({ borderColor: palette.info, color: palette.info })
    );
    expect(styles.fulfilledPill.color).toBe(palette.success);
    expect(styles.canceledPill.color).toBe(palette.danger);
    expect(styles.actionButton.backgroundColor).toBe(palette.accent);
    expect(styles.actionText.color).toBe(palette.accentText);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.secondaryActionText.color).toBe(palette.text);
    expect(styles.dangerButton.borderColor).toBe(palette.danger);
    expect(styles.dangerActionText.color).toBe(palette.danger);
    expect(styles.focusedOrderCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.accentSoft,
        borderColor: palette.accent
      })
    );
  });

  it("themes the Commercial profile and its editable fields", () => {
    const styles = createCommercialProfileStyles(palette);

    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.action).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.accent
      })
    );
    expect(styles.submit.backgroundColor).toBe(palette.accent);
    expect(styles.submitText.color).toBe(palette.accentText);
  });

  it("themes Commercial inventory creation, loading, choices, and errors", () => {
    const styles = createCommercialInventoryCreateStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.helpText.color).toBe(palette.textMuted);
    expect(styles.choice).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.accent
      })
    );
    expect(styles.choiceSelected.backgroundColor).toBe(palette.accentSoft);
    expect(styles.recordPicker).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.loadError).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.button.backgroundColor).toBe(palette.accent);
    expect(styles.buttonText.color).toBe(palette.accentText);
  });

  it("themes Commercial inventory detail, stock states, fields, and workflow links", () => {
    const styles = createCommercialInventoryItemDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.h1.color).toBe(palette.text);
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.summaryCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.border
      })
    );
    expect(styles.stockOk).toEqual(
      expect.objectContaining({
        borderColor: palette.success,
        color: palette.success
      })
    );
    expect(styles.stockWarn.color).toBe(palette.warning);
    expect(styles.stockDanger.color).toBe(palette.danger);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.primaryBtn.backgroundColor).toBe(palette.accent);
    expect(styles.primaryBtnText.color).toBe(palette.accentText);
    expect(styles.actionBtn).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.accent
      })
    );
    expect(styles.actionText.color).toBe(palette.link);
  });

  it("themes the routed and registered Commercial dashboard surfaces", () => {
    const routed = createCommercialDashboardStyles(palette);
    const registered = createCommercialDashboardScreenStyles(palette);

    expect(routed.headerTitle.color).toBe(palette.text);
    expect(routed.commandCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.accentSoft,
        borderColor: palette.border
      })
    );
    expect(routed.pulse).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(routed.actionItem.backgroundColor).toBe(palette.surfaceMuted);
    expect(routed.storefrontPrimaryAction.backgroundColor).toBe(palette.accent);
    expect(routed.storefrontPrimaryActionText.color).toBe(palette.accentText);
    expect(routed.actionText.color).toBe(palette.link);

    expect(registered.hero).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(registered.statCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(registered.error).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger,
        color: palette.danger
      })
    );
    expect(registered.primaryButton.backgroundColor).toBe(palette.accent);
    expect(registered.primaryButtonText.color).toBe(palette.accentText);
    expect(registered.actionArrow.color).toBe(palette.link);
  });

  it("themes Commercial task metrics, forms, filters, records, and actions", () => {
    const styles = createCommercialTasksStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.redMetric).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger
      })
    );
    expect(styles.blueMetric.borderColor).toBe(palette.info);
    expect(styles.form).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.chipSelected.backgroundColor).toBe(palette.accent);
    expect(styles.taskCard).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(styles.sourcePill.backgroundColor).toBe(palette.accentSoft);
    expect(styles.primaryButtonText.color).toBe(palette.accentText);
    expect(styles.ghostButtonText.color).toBe(palette.link);
  });

  it("keeps every editable placeholder palette-aware and removes fixed colors", () => {
    ROUTE_FILES.forEach((relativePath) => {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
      const textInputs = source.match(/<TextInput[\s\S]*?\/>/g) || [];

      textInputs.forEach((input) => {
        expect(input).toContain("placeholderTextColor={palette.textMuted}");
      });
      expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
      expect(source).not.toMatch(
        /(?:backgroundColor|borderColor|color):\s*["'](?:white|black|rgba?\()/i
      );
    });
  });
});
