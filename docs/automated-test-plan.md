# Automated QA/Regression Test Plan

This document provides a plan for automating your QA and regression tests using Playwright (for web/Expo web) and Detox (for React Native mobile). Adjust tools as needed for your stack.

---

## 1. Automated Test Tools

- **Web/Expo Web:** Playwright or Cypress
- **React Native Mobile:** Detox or Appium

## 2. Example Playwright Test (Web/Expo Web)

```javascript
// tests/growLogs.spec.js
import { test, expect } from "@playwright/test";

test("Free user cannot add multiple grows", async ({ page }) => {
  await page.goto("http://localhost:19006");
  // Login as Free user (implement login helper or mock)
  // Navigate to GrowLogs
  await page.click("text=GrowLogs");
  // Try to add a grow
  await page.fill('input[placeholder="e.g., Spring 2026"]', "Test Grow");
  await page.click("text=Create Grow");
  // Try to add another grow
  await page.click("text=Create Grow");
  // Expect upgrade CTA or alert
  await expect(page.locator("text=Upgrade Required")).toBeVisible();
});
```

## 3. Example Detox Test (React Native Mobile)

```js
// e2e/growLogs.e2e.js
describe("GrowLogsScreen", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login as Free user (mock or use test account)
  });

  it("should show upgrade CTA for multiple grows", async () => {
    await element(by.text("GrowLogs")).tap();
    await element(by.placeholder("e.g., Spring 2026")).typeText("Test Grow");
    await element(by.text("Create Grow")).tap();
    await element(by.text("Create Grow")).tap();
    await expect(element(by.text("Upgrade Required"))).toBeVisible();
  });
});
```

## 4. Test Coverage Checklist

- [ ] All entitlement-gated flows (add grow, upload photo, advanced fields, etc.)
- [ ] All roles (Free, Pro, Influencer, Commercial, Facility)
- [ ] All main screens
- [ ] Edge cases (invalid input, network loss, etc.)
- [ ] Accessibility (where possible)

## 5. How to Run

- For Playwright: `npx playwright test`
- For Detox: `detox test`

---

## Next Steps

- Implement the above tests for each user flow and role.
- Integrate with CI (GitHub Actions, etc.) for automated regression.
- Review and expand coverage as needed.

---

_Last updated: January 18, 2026_
