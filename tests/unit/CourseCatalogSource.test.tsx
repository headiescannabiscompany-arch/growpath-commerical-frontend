import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import CoursesScreen, { mergeCourseCatalogSources } from "@/screens/CoursesScreen";

const mockApi = jest.fn();
const mockForbidden = jest.fn();
const mockPush = jest.fn();
const mockDetail = jest.fn();
const mockAuth: any = {
  isAuthed: true,
  isHydrating: false,
  token: "synthetic-session",
  meStatus: "ready",
  user: { id: "reader", plan: "free", aiTokens: 37, growInterests: {} }
};
let mockCreate = false;
let mockPaid = true;
let publicRows: any[];
let ownedRows: any[];
let commercialRows: any[];
let beforeAccount: string;
let beforeRows: string;
let fetchGuard: jest.SpyInstance;

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("@/api/courses", () => ({
  getCourse: (...args: any[]) => mockForbidden(...args),
  unpublishCourse: (...args: any[]) => mockForbidden(...args)
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COURSES_VIEW: "COURSES_VIEW",
    SEE_PAID_COURSES: "SEE_PAID_COURSES",
    COURSES_CREATE: "COURSES_CREATE",
    COURSES_SELL_PAID: "COURSES_SELL_PAID",
    PUBLISH_COURSES: "PUBLISH_COURSES",
    COURSES_ANALYTICS: "COURSES_ANALYTICS",
    COURSES_CERTIFICATES: "COURSES_CERTIFICATES",
    COMMERCIAL_HOME: "COMMERCIAL_HOME"
  },
  useEntitlements: () => ({
    ready: true,
    mode: "personal",
    limits: {},
    can: (key: string) =>
      key === "COURSES_VIEW" ||
      (key === "SEE_PAID_COURSES" && mockPaid) ||
      (key === "COURSES_CREATE" && mockCreate)
  })
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/components/learning/AuthorizedCourseImage", () => () => null);
jest.mock("@/screens/CourseDetailScreen", () => (props: any) => {
  mockDetail(props);
  return null;
});
jest.mock("@/utils/buyerCheckoutRecovery", () => ({
  readPendingBuyerCheckout: (...args: any[]) => mockForbidden(...args)
}));

const SHARED = "/api/courses";
const OWNED = "/api/courses/mine";
const COMMERCIAL = "/api/commercial/courses/public";
function shared(fields: any = {}) {
  return Object.freeze({
    _id: "same-course",
    title: "Shared reader course",
    isPublished: true,
    access: "paid",
    price: null,
    priceCents: null,
    lessons: Object.freeze([{ title: "Shared outline" }]),
    ...fields
  });
}
function commercial(fields: any = {}) {
  return Object.freeze({
    id: "same-course",
    title: "Commercial preview",
    status: "published",
    access: "paid",
    price: 25,
    priceCents: 2500,
    sourceType: "commercial_course",
    storefrontSlug: "synthetic-store",
    lessons: Object.freeze([{ title: "Different source outline" }]),
    ...fields
  });
}
function owned(fields: any = {}) {
  return Object.freeze({
    _id: "same-course",
    title: "Owner draft",
    creator: "reader",
    isPublished: false,
    status: "draft",
    authoringSource: "commercial_record",
    access: "paid",
    priceCents: 1500,
    ...fields
  });
}
function rowsSnapshot() {
  return JSON.stringify([publicRows, ownedRows, commercialRows]);
}
function supply(pub: any[], own: any[], commercialItems: any[]) {
  publicRows = pub;
  ownedRows = own;
  commercialRows = commercialItems;
  beforeRows = rowsSnapshot();
}
function response(path: string) {
  if (path === SHARED) return { courses: publicRows };
  if (path === OWNED) return { courses: ownedRows };
  if (path === COMMERCIAL) return { courses: commercialRows };
  return mockForbidden(path);
}
async function settled(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.queryByText("Loading courses...")).toBeNull());
}
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("R09-04W catalog source selection", () => {
  beforeEach(() => {
    Object.assign(mockAuth, {
      isAuthed: true,
      isHydrating: false,
      token: "synthetic-session",
      user: Object.freeze({ id: "reader", plan: "free", aiTokens: 37, growInterests: {} })
    });
    beforeAccount = JSON.stringify(mockAuth);
    mockCreate = false;
    mockPaid = true;
    supply([shared()], [], [commercial()]);
    mockForbidden.mockImplementation(() => {
      throw new Error("Unexpected mutation/detail/payment path");
    });
    mockApi.mockImplementation(async (path, options) => {
      if (options?.method && options.method !== "GET") return mockForbidden(path);
      return response(path);
    });
    fetchGuard = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Real network forbidden"));
  });
  afterEach(() => {
    cleanup();
    expect(mockForbidden).not.toHaveBeenCalled();
    expect(fetchGuard).not.toHaveBeenCalled();
    expect(JSON.stringify(mockAuth)).toBe(beforeAccount);
    expect(rowsSnapshot()).toBe(beforeRows);
    expect(
      mockApi.mock.calls.every(
        ([path, options]) =>
          [SHARED, OWNED, COMMERCIAL].includes(path) &&
          (!options?.method || options.method === "GET")
      )
    ).toBe(true);
    fetchGuard.mockRestore();
  });

  test("shared whole record wins a same-ID preview without filling withheld fields", () => {
    const result = mergeCourseCatalogSources(publicRows, ownedRows, commercialRows);
    expect(result).toEqual(publicRows);
    expect(result[0]).not.toBe(publicRows[0]);
    expect(result[0]).not.toHaveProperty("sourceType");
    expect(result[0]).not.toHaveProperty("storefrontSlug");
    expect(result[0].priceCents).toBeNull();
  });
  test("owned whole record wins without inheriting public publication, price or lessons", () => {
    supply([shared()], [owned()], [commercial()]);
    const result = mergeCourseCatalogSources(publicRows, ownedRows, commercialRows);
    expect(result).toEqual([{ ...ownedRows[0], _viewerOwnsCourse: true }]);
    expect(result[0]).not.toHaveProperty("lessons");
    expect(result[0]).not.toHaveProperty("storefrontSlug");
  });
  test("mixed IDs keep stable order, one card per ID and complete fallback records", () => {
    supply(
      [shared()],
      [owned({ _id: "owner-only" })],
      [commercial(), commercial({ id: "commercial-only" })]
    );
    const result = mergeCourseCatalogSources(publicRows, ownedRows, commercialRows);
    expect(result.map((row: any) => row._id || row.id)).toEqual([
      "same-course",
      "owner-only",
      "commercial-only"
    ]);
    expect(result[0]).toEqual(publicRows[0]);
    expect(result[2]).toEqual(commercialRows[1]);
  });
  test("missing IDs cannot produce a mixed anonymous card", () => {
    expect(mergeCourseCatalogSources([{}], [{ title: "No ID" }], [null])).toEqual([]);
  });
  test("same-ID public conflict stays unavailable and opens the shared learner detail", async () => {
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
    expect(screen.queryByText("$25.00")).toBeNull();
    expect(screen.queryByText("Commercial preview")).toBeNull();
    fireEvent.press(screen.getByText("Shared reader course"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockDetail.mock.calls.at(-1)?.[0].route.params.course).toEqual({
      ...publicRows[0],
      _viewerOwnsCourse: false
    });
  });
  test("a free preview cannot smuggle its paid shared twin into free-only discovery", async () => {
    mockPaid = false;
    supply([shared()], [], [commercial({ access: "free", price: 0, priceCents: 0 })]);
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.queryByText("Shared reader course")).toBeNull();
    expect(screen.queryByText("Commercial preview")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockDetail).not.toHaveBeenCalled();
  });
  test("owned Commercial draft retains its authoring action without generic publication controls", async () => {
    mockCreate = true;
    supply([shared()], [owned()], [commercial()]);
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText("Owner draft")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText("$15.00")).toBeTruthy();
    expect(screen.queryByText("Published")).toBeNull();
    fireEvent.press(screen.getByLabelText("Manage Owner draft in Commercial workspace"));
    expect(mockPush.mock.calls).toEqual([["/home/commercial/courses/same-course"]]);
    expect(screen.queryByLabelText("Unpublish Owner draft")).toBeNull();
  });
  test("a colliding preview cannot relabel a native course or inject owner permissions", async () => {
    supply(
      [shared({ access: "free", price: 0, priceCents: 0, title: "Native course" })],
      [],
      [
        commercial({
          _viewerOwnsCourse: true,
          creator: "reader",
          authoringSource: "commercial_record"
        })
      ]
    );
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.queryByText("Manage in Commercial Workspace")).toBeNull();
    fireEvent.press(screen.getByText("Native course"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      mockDetail.mock.calls.at(-1)?.[0].route.params.course.sourceType
    ).toBeUndefined();
  });
  test("a Commercial-only listing beside a duplicate still opens its own storefront", async () => {
    supply(
      [shared()],
      [],
      [
        commercial(),
        commercial({ id: "standalone", title: "Standalone storefront course" })
      ]
    );
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText("Shared reader course")).toBeTruthy();
    fireEvent.press(screen.getByText("Standalone storefront course"));
    expect(mockPush.mock.calls).toEqual([["/store/synthetic-store/courses/standalone"]]);
    expect(screen.queryByText("Commercial preview")).toBeNull();
  });
  test("shared-source failure keeps explicit partial warning and Commercial-only fallback", async () => {
    mockApi.mockImplementation(async (path) => {
      if (path === SHARED) throw new Error("Synthetic unavailable");
      return response(path);
    });
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText(/Some course sources could not load/)).toBeTruthy();
    fireEvent.press(screen.getByText("Commercial preview"));
    expect(mockPush.mock.calls).toEqual([["/store/synthetic-store/courses/same-course"]]);
  });
  test("Commercial failure does not discard or combine the owned and shared same-ID records", async () => {
    mockCreate = true;
    supply([shared()], [owned()], [commercial()]);
    mockApi.mockImplementation(async (path) => {
      if (path === COMMERCIAL) throw new Error("Synthetic unavailable");
      return response(path);
    });
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText(/Some course sources could not load/)).toBeTruthy();
    expect(screen.getByText("Owner draft")).toBeTruthy();
    expect(screen.queryByText("Shared reader course")).toBeNull();
    expect(screen.getByText("$15.00")).toBeTruthy();
  });
  test("retry replaces a fallback with the newly available shared record without retaining preview fields", async () => {
    let sharedReads = 0;
    mockApi.mockImplementation(async (path) => {
      if (path === SHARED && ++sharedReads === 1)
        throw new Error("Synthetic unavailable");
      return response(path);
    });
    const screen = render(<CoursesScreen />);
    await settled(screen);
    fireEvent.press(screen.getByLabelText("Retry course catalog"));
    await screen.findByText("Shared reader course");
    await settled(screen);
    expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
    expect(screen.queryByText("$25.00")).toBeNull();
    expect(screen.queryByText(/Some course sources could not load/)).toBeNull();
    fireEvent.press(screen.getByText("Shared reader course"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      mockDetail.mock.calls.at(-1)?.[0].route.params.course.storefrontSlug
    ).toBeUndefined();
  });
  test.each(["shared first", "Commercial first"])(
    "same-ID authority is independent of completion order: %s",
    async (order) => {
      const pub = deferred();
      const commercialRead = deferred();
      mockApi.mockImplementation((path) =>
        path === SHARED ? pub.promise : commercialRead.promise
      );
      const screen = render(<CoursesScreen />);
      await act(async () => {
        if (order === "shared first") pub.resolve({ courses: publicRows });
        else commercialRead.resolve({ courses: commercialRows });
      });
      expect(screen.queryByText("Shared reader course")).toBeNull();
      expect(screen.queryByText("Commercial preview")).toBeNull();
      await act(async () => {
        if (order === "shared first") commercialRead.resolve({ courses: commercialRows });
        else pub.resolve({ courses: publicRows });
      });
      await settled(screen);
      expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
      expect(screen.queryByText("Commercial preview")).toBeNull();
    }
  );
  test("signed-out duplicate selection never asks for owned records or exposes authoring", async () => {
    Object.assign(mockAuth, { isAuthed: false, token: null, user: null });
    beforeAccount = JSON.stringify(mockAuth);
    mockCreate = true;
    const screen = render(<CoursesScreen />);
    await settled(screen);
    expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
    expect(mockApi.mock.calls.map(([path]) => path)).toEqual([SHARED, COMMERCIAL]);
    expect(screen.queryByText("Manage in Commercial Workspace")).toBeNull();
  });
});
