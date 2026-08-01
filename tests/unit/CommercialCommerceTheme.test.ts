import fs from "fs";
import path from "path";

import { createCommercialProductDetailStyles } from "@/app/home/commercial/products/[productId]";
import { createCommercialProductsStyles } from "@/app/home/commercial/products";
import { createStorefrontOwnerStyles } from "@/screens/commercial/StorefrontOwnerScreen";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({}) }));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { STORE_FRONT_VIEW: "storefront.view" },
  useEntitlements: () => ({})
}));

const nightPalette = getThemePalette("night", "dark");
const dayPalette = getThemePalette("day", "light");

describe("Commercial commerce active palette", () => {
  it("themes storefront surfaces, fields, statuses, warnings, and actions", () => {
    const styles = createStorefrontOwnerStyles(nightPalette);

    expect(styles.headerTitle.color).toBe(nightPalette.text);
    expect(styles.metric).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.objectAction).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.warningBox).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning
      })
    );
    expect(styles.warningText.color).toBe(nightPalette.warning);
    expect(styles.primaryButton.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryText.color).toBe(nightPalette.accentText);
    expect(styles.selectedButton.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.livePill.color).toBe(nightPalette.success);
  });

  it("themes product create, publication, payment, warning, and catalog states", () => {
    const styles = createCommercialProductsStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.productRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border
      })
    );
    expect(styles.selected).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.warning
      })
    );
    expect(styles.warningPill.color).toBe(nightPalette.warning);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("themes product detail evidence, payment fields, status, and save actions", () => {
    const styles = createCommercialProductDetailStyles(nightPalette);

    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.detailRow).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surfaceMuted,
        borderColor: nightPalette.border
      })
    );
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(styles.focusBox).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.accentSoft,
        borderColor: nightPalette.success
      })
    );
    expect(styles.statusPill.color).toBe(nightPalette.warning);
    expect(styles.primaryAction.backgroundColor).toBe(nightPalette.accent);
    expect(styles.primaryActionText.color).toBe(nightPalette.accentText);
  });

  it("keeps Day mode palette-driven and gives every commerce field a themed placeholder", () => {
    expect(createStorefrontOwnerStyles(dayPalette).input.backgroundColor).toBe(
      dayPalette.surface
    );
    expect(createCommercialProductsStyles(dayPalette).input.color).toBe(dayPalette.text);
    expect(createCommercialProductDetailStyles(dayPalette).input.borderColor).toBe(
      dayPalette.border
    );

    const sources = [
      "src/screens/commercial/StorefrontOwnerScreen.tsx",
      "src/app/home/commercial/products/index.tsx",
      "src/app/home/commercial/products/[productId].tsx"
    ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"));

    for (const source of sources) {
      expect(source).toContain("placeholderTextColor={palette.textMuted}");
      expect(source).toContain("selectionColor={palette.accent}");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    }
  });
});
