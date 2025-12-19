const test = require("node:test");
const assert = require("node:assert/strict");

const { requirePro, isPro403Error, handleApiError } = require("../src/utils/proHelper.js");

test("requirePro executes the action for Pro users", () => {
  let actionInvoked = false;
  const navigation = { navigate: () => { throw new Error("should not navigate"); } };

  requirePro(navigation, true, () => {
    actionInvoked = true;
  });

  assert.equal(actionInvoked, true);
});

test("requirePro navigates to Paywall for free users", () => {
  let navigated = false;
  const navigation = {
    navigate: (screen) => {
      navigated = navigated || screen === "Paywall";
    }
  };

  requirePro(navigation, false, () => {
    throw new Error("action should not run");
  });

  assert.equal(navigated, true);
});

test("isPro403Error detects errors with status/data and Axios-style response objects", () => {
  const directError = { status: 403, data: { message: "PRO access only" } };
  const responseError = {
    response: { status: 403, data: { message: "Upgrade to PRO" } }
  };
  const nonProError = { status: 400, data: { message: "Bad request" } };

  assert.equal(isPro403Error(directError), true);
  assert.equal(isPro403Error(responseError), true);
  assert.equal(isPro403Error(nonProError), false);
});

test("handleApiError navigates only when error requires PRO", () => {
  const navigation = {
    navigations: [],
    navigate(screen) {
      this.navigations.push(screen);
    }
  };

  const proError = { status: 403, data: { message: "PRO required" } };
  const otherError = { status: 401, data: { message: "Unauthorized" } };

  const handledPro = handleApiError(proError, navigation);
  const handledOther = handleApiError(otherError, navigation);

  assert.equal(handledPro, true);
  assert.equal(handledOther, false);
  assert.deepEqual(navigation.navigations, ["Paywall"]);
});
