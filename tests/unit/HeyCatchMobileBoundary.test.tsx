import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostHog } from "posthog-react-native";
import {
  HEYCATCH_INGESTION_TOKEN,
  HEYCATCH_PROJECT_KEY
} from "../../src/analytics/marketingPolicy";
import { filterNativeEvent } from "../../src/analytics/nativePolicy";
import {
  MobileAnalyticsBoundary,
  MobileAnalyticsChoice
} from "../../src/analytics/MobileAnalytics";

let mockPath = "/about";
jest.mock("expo-router", () => ({ usePathname: () => mockPath }));
jest.mock("posthog-react-native", () => ({ PostHog: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() }
}));
jest.mock("../../src/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: { text: "#111", textSoft: "#333", danger: "#900" } })
}));
const label = "Allow optional mobile screen analytics";
const ui = () => (
  <MobileAnalyticsBoundary>
    <MobileAnalyticsChoice />
  </MobileAnalyticsBoundary>
);
let transport: any;
beforeEach(() => {
  mockPath = "/about";
  transport = {
    screen: jest.fn(),
    capture: jest.fn(),
    optIn: jest.fn(async () => {}),
    optOut: jest.fn(async () => {})
  };
  (PostHog as unknown as jest.Mock).mockImplementation(() => transport);
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});
it("is off initially, preserves explicit consent, and disables every automatic capture source", async () => {
  const view = render(ui());
  await waitFor(() => expect(view.getByLabelText(label).props.disabled).toBe(false));
  expect(PostHog).not.toHaveBeenCalled();
  fireEvent(view.getByLabelText(label), "valueChange", true);
  await waitFor(() => expect(view.getByLabelText(label).props.value).toBe(true));
  const options = (PostHog as unknown as jest.Mock).mock.calls[0][1];
  expect(options).toMatchObject({
    persistence: "memory",
    defaultOptIn: false,
    captureAppLifecycleEvents: false,
    capturePushNotificationSubscriptions: false,
    capturePushNotificationOpened: false,
    enableSessionReplay: false,
    personProfiles: "never",
    errorTracking: { autocapture: false },
    disableRemoteFeatureFlags: true,
    disableSurveys: true
  });
  expect(transport.screen).toHaveBeenCalledWith("/about");
  mockPath = "/admin";
  view.rerender(ui());
  expect(
    options.before_send[0]({ event: "$screen", properties: { $screen_name: "/admin" } })
  ).toBeNull();
  fireEvent(view.getByLabelText(label), "valueChange", false);
  await waitFor(() =>
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      "growpath.mobile-screen-analytics.v1",
      "no"
    )
  );
  expect(view.getByLabelText(label).props.value).toBe(false);
});
it("storage failure stays off", async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("storage"));
  const view = render(ui());
  await waitFor(() => expect(view.getByText(/Could not load/)).toBeTruthy());
  expect(PostHog).not.toHaveBeenCalled();
});
it("failed preference write never activates a client", async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("storage"));
  const view = render(ui());
  await waitFor(() => expect(view.getByLabelText(label).props.disabled).toBe(false));
  fireEvent(view.getByLabelText(label), "valueChange", true);
  await waitFor(() => expect(view.getByText(/Could not save/)).toBeTruthy());
  expect(PostHog).not.toHaveBeenCalled();
});
it("unmount while saving cannot activate analytics afterward", async () => {
  let finish!: (value: unknown) => void;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = render(ui());
  await waitFor(() => expect(view.getByLabelText(label).props.disabled).toBe(false));
  fireEvent(view.getByLabelText(label), "valueChange", true);
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  view.unmount();
  await act(async () => {
    finish(undefined);
  });
  expect(PostHog).not.toHaveBeenCalled();
});

it("filters the actual installed native transport before any network payload", async () => {
  // No real analytics: intercept every fetch, including remote configuration.
  const originalBlob = global.Blob;
  global.Blob = require("node:buffer").Blob;
  const requests: { url: string; body: string }[] = [];
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockImplementation(async (url: any, init: any) => {
      let body = String(init?.body || "");
      if (init?.body?.arrayBuffer) {
        const bytes = Buffer.from(await init.body.arrayBuffer());
        body = (
          bytes[0] === 31 && bytes[1] === 139
            ? require("node:zlib").gunzipSync(bytes)
            : bytes
        ).toString("utf8");
      }
      requests.push({ url: String(url), body });
      return {
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: async () => ({}),
        text: async () => "{}"
      } as any;
    });
  const view = render(ui());
  await waitFor(() => expect(view.getByLabelText(label).props.disabled).toBe(false));
  fireEvent(view.getByLabelText(label), "valueChange", true);
  await waitFor(() => expect(PostHog).toHaveBeenCalled());
  const options = (PostHog as unknown as jest.Mock).mock.calls[0][1];
  const ActualPostHog = jest.requireActual("posthog-react-native").PostHog;
  let allowed = true;
  const filter = jest.fn((event) => filterNativeEvent(event, "/about", allowed));
  const client = new ActualPostHog(HEYCATCH_INGESTION_TOKEN, {
    ...options,
    flushAt: 100,
    before_send: [filter]
  });
  try {
    await client.ready();
    await client.optIn();
    client.capture("$groupidentify", {
      $group_type: "project",
      $group_key: HEYCATCH_PROJECT_KEY,
      $group_set: { email: "PRIVATE_SENTINEL" }
    });
    await client.screen("/about", {
      email: "PRIVATE_SENTINEL",
      params: { secret: "PRIVATE_SENTINEL" }
    });
    client.capture("$autocapture", { text: "PRIVATE_SENTINEL" });
    await client.flush();
    expect(filter).toHaveBeenCalled();
    const batches = requests.filter((r) => r.body.includes("$screen"));
    expect(batches).toHaveLength(1);
    expect(batches[0].url).toMatch(/^https:\/\/in\.heycatch\.ai\//);
    expect(batches[0].body).toContain("heycatch_project_key");
    expect(batches[0].body).not.toContain("PRIVATE_SENTINEL");
    expect(batches[0].body).not.toContain("$autocapture");
    const registrationBatches = requests.filter((r) => r.body.includes("$groupidentify"));
    expect(registrationBatches).toHaveLength(1);
    expect(registrationBatches[0].body).toContain('"framework":"react-native"');
    expect(registrationBatches[0].body).not.toContain("PRIVATE_SENTINEL");
    allowed = false;
    await client.optOut();
    client.capture("$groupidentify", {
      $group_type: "project",
      $group_key: HEYCATCH_PROJECT_KEY
    });
    await client.screen("/about");
    await client.flush();
    expect(requests.filter((r) => r.body.includes("$screen"))).toHaveLength(1);
    expect(requests.filter((r) => r.body.includes("$groupidentify"))).toHaveLength(1);
  } finally {
    await client.shutdown(100);
    view.unmount();
    fetchMock.mockRestore();
    global.Blob = originalBlob;
  }
});
