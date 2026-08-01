import { createDebugStyles } from "@/screens/DebugScreen";
import { createVendorSignupStyles } from "@/screens/VendorSignup";
import { getThemePalette } from "@/theme/appTheme";

describe("legacy utility theme coverage", () => {
  it("uses the active Night palette for the debug surface", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createDebugStyles(palette);

    expect(styles.safe.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.mono.color).toBe(palette.textSoft);
    expect(styles.btn.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Night palette for the vendor form and controls", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createVendorSignupStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.form.backgroundColor).toBe(palette.card);
    expect(styles.form.borderColor).toBe(palette.border);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.borderColor).toBe(palette.border);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.picker.color).toBe(palette.text);
    expect(styles.button.backgroundColor).toBe(palette.accent);
  });
});
