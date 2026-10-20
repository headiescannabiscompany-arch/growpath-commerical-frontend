import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { CourseGiftRecipientPanel } from "@/components/courseGifts/CourseGiftPanels";
import {
  giftClaimTiming,
  type GiftRecipientState
} from "@/components/courseGifts/courseGiftPresentation";
import { createInternalCourseGiftClient } from "@/api/courseGiftClient";
import { createCourseGiftContinuation } from "@/utils/courseGiftContinuation";
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
const state = (): GiftRecipientState => ({
  giftId: "d".repeat(24),
  courseId: "c".repeat(24),
  courseTitle: "Synthetic course",
  recipient: "r***@example.invalid",
  claimExpiresAt: "2099-01-01T00:00:00.000Z",
  claimExpiryMode: "none",
  inactivityFeeCents: 0,
  code: "COURSE_GIFT_TRANSACTION_REQUIRED"
});
let network: jest.SpyInstance;
beforeEach(() => {
  network = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("Network forbidden");
  });
});
afterEach(() => {
  expect(network).not.toHaveBeenCalled();
});
function fixture(value: unknown) {
  const continuation = createCourseGiftContinuation();
  continuation.capture({
    location: {
      pathname: "/claim-course-gift",
      search: "",
      hash: `#token=${"a".repeat(64)}`
    },
    history: { replaceState: jest.fn() }
  });
  return createInternalCourseGiftClient({
    platform: "web",
    continuation,
    auth: () => ({
      state: "ready",
      userId: "b".repeat(24),
      sessionKey: "synthetic",
      emailVerified: true
    }),
    getAccessToken: jest.fn().mockResolvedValue("synthetic-not-a-credential"),
    invoke: jest.fn().mockResolvedValue(value)
  });
}
test("no-expiry recipient copy describes only the security-link deadline", () => {
  const view = render(
    <CourseGiftRecipientPanel
      scopeKey="synthetic"
      state={state()}
      onClaim={jest.fn()}
      onRecheck={jest.fn()}
      onSignIn={jest.fn()}
      onOpenCourse={jest.fn()}
    />
  );
  expect(view.getByText(giftClaimTiming(state()))).toBeTruthy();
  expect(view.queryByText(/Claim by \(UTC\)/)).toBeNull();
  view.unmount();
});
test("no-expiry does not permit an expired link to claim", () => {
  const onClaim = jest.fn();
  const view = render(
    <CourseGiftRecipientPanel
      scopeKey="synthetic"
      state={{ ...state(), claimExpiresAt: "2020-01-01T00:00:00.000Z" }}
      onClaim={onClaim}
      onRecheck={jest.fn()}
      onSignIn={jest.fn()}
      onOpenCourse={jest.fn()}
    />
  );
  const button = view.queryByText("Claim course gift");
  if (button) fireEvent.press(button);
  expect(onClaim).not.toHaveBeenCalled();
  view.unmount();
});
test("no-expiry client preserves explicit policy fields", async () => {
  const client = fixture(state());
  try {
    expect(await client.reviewRecipient()).toMatchObject({
      claimExpiryMode: "none",
      inactivityFeeCents: 0
    });
  } finally {
    client.dispose();
  }
});
test.each([
  { claimExpiryMode: undefined },
  { inactivityFeeCents: undefined },
  { claimExpiryMode: "fixed" },
  { inactivityFeeCents: 1 },
  { inactivityFeeCents: "0" },
  { claimExpiryMode: null }
])("no-expiry client rejects incomplete or contradictory policy: %j", async (change) => {
  const client = fixture({ ...state(), ...change });
  try {
    await expect(client.reviewRecipient()).rejects.toMatchObject({
      code: "COURSE_GIFT_RESPONSE_INVALID"
    });
  } finally {
    client.dispose();
  }
});
test("legacy recipient copy remains unchanged without the explicit policy", () => {
  const old = state();
  delete old.claimExpiryMode;
  delete old.inactivityFeeCents;
  expect(giftClaimTiming(old)).toBe(`Claim by (UTC): ${old.claimExpiresAt}`);
});
