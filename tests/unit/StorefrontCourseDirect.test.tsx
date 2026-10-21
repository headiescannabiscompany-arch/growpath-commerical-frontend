import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import Page from "@/app/store/[slug]/courses/[courseId]";
import Alias from "@/app/storefront/[slug]/courses/[courseId]";
import { fetchPublicStorefrontCourse } from "@/api/storefront";

const ID = "64f000000000000000000403";
const NEXT_ID = "64f000000000000000000409";
const base = "/api/commercial/storefront/public/direct-fixture";
const mockApiRequest = jest.fn();
const mockPayment = jest.fn();
const mockAnalytics = jest.fn();
const mockPending = jest.fn();
const mockWrite = jest.fn();
const mockPush = jest.fn();
let mockParams: any;
const mockAuth = {
  isAuthed: false,
  isHydrating: false,
  user: Object.freeze({ id: "synthetic", plan: "free", aiTokens: 37 })
};
let store: any;
let preview: any;
let fetchGuard: jest.SpyInstance;
let openUrl: jest.SpyInstance;
let before: string;
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/coursePayments", () => ({
  pollCourseAccessStatus: (...args: any[]) => mockPayment(...args),
  startCourseCheckout: (...args: any[]) => mockPayment(...args)
}));
jest.mock("@/api/commercialAnalytics", () => ({
  recordCommercialAnalyticsEvent: (...args: any[]) => mockAnalytics(...args)
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
  useOptionalAuth: () => mockAuth
}));
jest.mock("@/utils/buyerCheckoutRecovery", () => ({
  readPendingBuyerCheckout: (...args: any[]) => mockPending(...args),
  rememberPendingBuyerCheckout: (...args: any[]) => mockWrite(...args),
  clearPendingBuyerCheckout: (...args: any[]) => mockWrite(...args)
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ push: mockPush }),
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});
jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});
jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}
function directCalls() {
  return mockApiRequest.mock.calls.filter(([path]) => /\/courses\//.test(path));
}
async function loaded(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.queryByText("Loading course...")).toBeNull());
}
function noActions(screen: ReturnType<typeof render>) {
  expect(screen.queryByLabelText("Buy storefront course")).toBeNull();
  expect(screen.queryByLabelText("Open storefront course")).toBeNull();
  expect(screen.queryByText("Share Course")).toBeNull();
}

describe("R09-04V direct course landing", () => {
  beforeEach(() => {
    mockParams = { slug: "direct-fixture", courseId: ID };
    store = {
      storefront: { name: "Synthetic store", slug: "direct-fixture" },
      courses: [],
      products: [],
      lives: [],
      feedPosts: [],
      forumThreads: []
    };
    preview = {
      id: ID,
      _id: ID,
      title: "Synthetic unlisted course",
      storefrontSlug: "direct-fixture",
      status: "published",
      visibility: "unlisted",
      access: "paid",
      priceCents: 1200,
      lessonCount: 1
    };
    mockApiRequest.mockImplementation((path) =>
      path.includes("/courses/")
        ? Promise.resolve({ course: { ...preview } })
        : Promise.resolve(store)
    );
    mockAnalytics.mockResolvedValue({});
    mockPending.mockResolvedValue(null);
    mockPayment.mockImplementation(() => {
      throw new Error("Payment forbidden");
    });
    mockWrite.mockImplementation(() => {
      throw new Error("Persistence forbidden");
    });
    fetchGuard = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network forbidden"));
    openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    before = JSON.stringify(mockAuth);
  });
  afterEach(() => {
    cleanup();
    expect(mockPayment).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(fetchGuard).not.toHaveBeenCalled();
    expect(JSON.stringify(mockAuth)).toBe(before);
    fetchGuard.mockRestore();
    openUrl.mockRestore();
  });

  test("opens an exact unlisted preview absent from the public directory without granting access", async () => {
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getAllByText(preview.title).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Buy storefront course")).toBeTruthy();
    expect(directCalls()).toHaveLength(1);
    expect(store.courses).toEqual([]);
    expect(openUrl).not.toHaveBeenCalled();
  });
  test("storefront alias uses the same exact reader", async () => {
    expect(Alias).toBe(Page);
    const screen = render(<Alias />);
    await loaded(screen);
    expect(screen.getByLabelText("Buy storefront course")).toBeTruthy();
    expect(directCalls()[0][0]).toBe(`${base}/courses/${ID}`);
  });
  test("direct rejection cannot fall back to a stale directory entry", async () => {
    store.courses = [preview];
    mockApiRequest.mockImplementation((path) =>
      path.includes("/courses/")
        ? Promise.reject(new Error("Course not found"))
        : Promise.resolve(store)
    );
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getByText("Course not found")).toBeTruthy();
    noActions(screen);
    expect(screen.queryByText(preview.title)).toBeNull();
  });
  test.each([
    ["wrong ID", { id: NEXT_ID, _id: NEXT_ID }],
    ["conflicting IDs", { _id: NEXT_ID }],
    ["wrong store", { storefrontSlug: "other-fixture" }],
    ["private response", { visibility: "private" }],
    ["withdrawn response", { status: "draft" }]
  ])("rejects %s without using directory fallback", async (_label, changes) => {
    store.courses = [{ ...preview }];
    Object.assign(preview, changes);
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getByText("Course preview unavailable.")).toBeTruthy();
    noActions(screen);
  });
  test("read-only retry is single-flight and recovers a failed direct read", async () => {
    const pending = deferred();
    let calls = 0;
    mockApiRequest.mockImplementation((path) => {
      if (!path.includes("/courses/")) return Promise.resolve(store);
      calls++;
      return calls === 1 ? Promise.reject(new Error("Offline")) : pending.promise;
    });
    const screen = render(<Page />);
    await loaded(screen);
    const retry = screen.getByLabelText("Retry course preview");
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(directCalls()).toHaveLength(2);
    noActions(screen);
    await act(async () => pending.resolve({ course: preview }));
    await loaded(screen);
    expect(screen.getByLabelText("Buy storefront course")).toBeTruthy();
  });
  test.each(["course ID", "store slug"])(
    "late response cannot replace the next %s",
    async (part) => {
      const old = deferred();
      const oldPreview = { ...preview };
      mockApiRequest.mockImplementation((path) => {
        if (path === `${base}/courses/${ID}`) return old.promise;
        return Promise.resolve(
          path.includes("/courses/") ? { course: { ...preview } } : store
        );
      });
      const screen = render(<Page />);
      await waitFor(() => expect(directCalls()).toHaveLength(1));
      preview = {
        ...preview,
        title: "Next preview",
        ...(part === "course ID"
          ? { id: NEXT_ID, _id: NEXT_ID }
          : { storefrontSlug: "other-fixture" })
      };
      mockParams = { slug: preview.storefrontSlug, courseId: preview.id };
      store = {
        ...store,
        storefront: { ...store.storefront, slug: preview.storefrontSlug }
      };
      screen.rerender(<Page />);
      await loaded(screen);
      await act(async () => old.resolve({ course: oldPreview }));
      expect(screen.getAllByText("Next preview").length).toBeGreaterThan(0);
      expect(screen.queryByText(oldPreview.title)).toBeNull();
      expect(
        mockAnalytics.mock.calls.every(
          ([event]) =>
            event.courseId === preview.id &&
            event.storefrontSlug === preview.storefrontSlug
        )
      ).toBe(true);
    }
  );
  test("unmount ignores pending preview and does not start access or analytics", async () => {
    const pending = deferred();
    mockApiRequest.mockReturnValue(pending.promise);
    const screen = render(<Page />);
    screen.unmount();
    await act(async () => pending.resolve({ ...store, course: preview }));
    expect(mockAnalytics).not.toHaveBeenCalled();
    expect(mockPending).not.toHaveBeenCalled();
  });
  test("legacy public title alias still resolves from the directory only", async () => {
    mockParams.courseId = "public-course";
    store.courses = [{ ...preview, title: "Public course", visibility: "public" }];
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getAllByText("Public course").length).toBeGreaterThan(0);
    expect(directCalls()).toHaveLength(0);
  });
  test.each(["%E0%A4%A", [ID, NEXT_ID], ""])(
    "invalid route value %j produces no reads or actions",
    async (value) => {
      mockParams.courseId = value;
      const screen = render(<Page />);
      await loaded(screen);
      expect(screen.getByText("Invalid course link.")).toBeTruthy();
      expect(mockApiRequest).not.toHaveBeenCalled();
      noActions(screen);
    }
  );
  test("signed-out paid action retains login return and never starts checkout from a preview", async () => {
    const screen = render(<Page />);
    await loaded(screen);
    fireEvent.press(screen.getByLabelText("Buy storefront course"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(`/store/direct-fixture/courses/${ID}`))
    );
    expect(openUrl).not.toHaveBeenCalled();
  });
  test("free action delegates to the existing course reader rather than granting enrollment", async () => {
    Object.assign(preview, { access: "free", priceCents: 0 });
    const screen = render(<Page />);
    await loaded(screen);
    fireEvent.press(screen.getByLabelText("Open storefront course"));
    await waitFor(() => expect(openUrl).toHaveBeenCalledWith(`/courses?courseId=${ID}`));
  });
  test("direct API read is anonymous, bounded and balance-silent", async () => {
    await fetchPublicStorefrontCourse("direct-fixture", ID);
    expect(mockApiRequest).toHaveBeenCalledWith(`${base}/courses/${ID}`, {
      method: "GET",
      auth: false,
      retries: 0,
      timeoutMs: 15000,
      notifyTokenBalance: false,
      invalidateOn401: false,
      cache: "no-store"
    });
  });
  test("paused dispensary offers a separate validated course continuation without store or payment actions", async () => {
    store.storefront.storefrontType = "dispensary";
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getByText("Open this course in Courses")).toBeTruthy();
    noActions(screen);
    fireEvent.press(screen.getByLabelText("Continue to course learning page"));
    expect(mockPush).toHaveBeenCalledWith(`/courses?courseId=${ID}`);
    expect(mockAnalytics).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
  });
  test("server-paused dispensary offers the same separate course continuation", async () => {
    mockApiRequest.mockImplementation((path) =>
      path.includes("/courses/")
        ? Promise.resolve({ course: preview })
        : Promise.reject({ code: "DISPENSARY_DISCOVERY_UNAVAILABLE" })
    );
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getByLabelText("Continue to course learning page")).toBeTruthy();
    noActions(screen);
  });
  test.each([
    { id: NEXT_ID, _id: NEXT_ID },
    { storefrontSlug: "other-store" },
    { visibility: "private" },
    { status: "draft" }
  ])("paused store does not bypass exact course checks: %j", async (changes) => {
    store.storefront.storefrontType = "dispensary";
    Object.assign(preview, changes);
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.queryByLabelText("Continue to course learning page")).toBeNull();
    expect(screen.getByText("Course preview unavailable.")).toBeTruthy();
    noActions(screen);
  });
  test("failed storefront context cannot render an actionable direct preview", async () => {
    mockApiRequest.mockImplementation((path) =>
      path.includes("/courses/")
        ? Promise.resolve({ course: preview })
        : Promise.reject(new Error("Store unavailable"))
    );
    const screen = render(<Page />);
    await loaded(screen);
    expect(screen.getByText("Store unavailable")).toBeTruthy();
    noActions(screen);
  });
});
