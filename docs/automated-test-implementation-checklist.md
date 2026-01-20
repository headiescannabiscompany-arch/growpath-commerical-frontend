# Automated Test Implementation Checklist

This checklist will help you implement and integrate automated tests for your app using Playwright (web/Expo web) and Detox (React Native mobile). Adjust for your stack as needed.

---

## 1. Install Test Tools

- [ ] Playwright: `npm install --save-dev @playwright/test`
- [ ] Detox: `npm install --save-dev detox`
- [ ] (Optional) Cypress, Appium, or other tools as needed

## 2. Project Setup

- [ ] Add `tests/` (for Playwright) and `e2e/` (for Detox) folders to your project
- [ ] Add example test files (see docs/automated-test-plan.md)
- [ ] Add test scripts to `package.json`:
  ```json
  "scripts": {
    "test:playwright": "playwright test",
    "test:detox": "detox test"
  }
  ```

## 3. Implement Example Tests

- [ ] Copy/paste and adapt the Playwright and Detox examples from docs/automated-test-plan.md
- [ ] Write tests for all entitlement-gated flows, all roles, and all main screens
- [ ] Add edge case and error handling tests

## 4. Run and Debug Tests

- [ ] Run `npm run test:playwright` and `npm run test:detox`
- [ ] Debug and fix any failing tests
- [ ] Ensure tests pass on CI and local machines

## 5. Integrate with CI

- [ ] Add test steps to your CI pipeline (GitHub Actions, etc.)
- [ ] Ensure tests run on every pull request and before deploys

## 6. Maintain and Expand Coverage

- [ ] Regularly update tests as features change
- [ ] Add new tests for new features and bug fixes

---

## References

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Detox Docs](https://wix.github.io/Detox/docs/introduction/getting-started/)
- [Automated Test Plan](automated-test-plan.md)

---

_Last updated: January 18, 2026_
