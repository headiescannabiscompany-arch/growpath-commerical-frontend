import { createForgotPasswordStyles } from "@/app/forgot-password";
import { createLoginStyles } from "@/app/login";
import { createRegisterStyles } from "@/app/register";
import { createResetPasswordStyles } from "@/app/reset-password";
import { createVerifyEmailStyles } from "@/app/verify-email";
import { getThemePalette } from "@/theme/appTheme";

describe("authentication route Night theme", () => {
  const palette = getThemePalette("night", "dark");

  it("themes the complete sign-in and verification surfaces", () => {
    const login = createLoginStyles(palette);
    const verify = createVerifyEmailStyles(palette);

    expect(login.root.backgroundColor).toBe(palette.page);
    expect(login.formCard.backgroundColor).toBe(palette.surface);
    expect(login.input.backgroundColor).toBe(palette.surface);
    expect(login.input.color).toBe(palette.text);
    expect(login.verificationBox.backgroundColor).toBe(palette.surfaceMuted);
    expect(login.secondaryButton.backgroundColor).toBe(palette.surface);
    expect(verify.root.backgroundColor).toBe(palette.page);
    expect(verify.panel.backgroundColor).toBe(palette.surface);
    expect(verify.title.color).toBe(palette.text);
    expect(verify.message.color).toBe(palette.textSoft);
  });

  it("themes registration plans, form fields, and content choices", () => {
    const register = createRegisterStyles(palette);

    expect(register.root.backgroundColor).toBe(palette.page);
    expect(register.title.color).toBe(palette.text);
    expect(register.choice.backgroundColor).toBe(palette.surface);
    expect(register.choiceActive.borderColor).toBe(palette.accent);
    expect(register.formCard.backgroundColor).toBe(palette.surface);
    expect(register.input.backgroundColor).toBe(palette.surface);
    expect(register.input.color).toBe(palette.text);
    expect(register.contentChoice.borderColor).toBe(palette.border);
    expect(register.contentChoiceTitle.color).toBe(palette.text);
  });

  it("themes both password recovery stages", () => {
    const forgot = createForgotPasswordStyles(palette);
    const reset = createResetPasswordStyles(palette);

    for (const styles of [forgot, reset]) {
      expect(styles.root.backgroundColor).toBe(palette.page);
      expect(styles.panel.backgroundColor).toBe(palette.surface);
      expect(styles.panel.borderColor).toBe(palette.border);
      expect(styles.title.color).toBe(palette.text);
      expect(styles.message.color).toBe(palette.textSoft);
      expect(styles.input.backgroundColor).toBe(palette.surface);
      expect(styles.input.borderColor).toBe(palette.border);
      expect(styles.input.color).toBe(palette.text);
    }
  });
});
