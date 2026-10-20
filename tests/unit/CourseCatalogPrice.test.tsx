import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesScreen from "@/screens/CoursesScreen";
import CategoryCoursesScreen from "@/screens/CategoryCoursesScreen";

const mockApiRequest = jest.fn();
const mockCategoryRead = jest.fn();
const mockForbiddenCourseCall = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockAuth = {
  isAuthed: true,
  isHydrating: false,
  token: "synthetic-catalog-session" as string | null,
  meStatus: "ready",
  user: { id: "catalog-reader", plan: "free", aiTokens: 37, growInterests: {} } as any
};
let mockPaidDiscovery = true;
let mockMode = "personal";
let mockPublicCourses: any[] = [];
let mockCommercialCourses: any[] = [];
let accountBefore: string;
let recordsBefore: string;
let fetchGuard: jest.SpyInstance;

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/courses", () => ({
  getCategoryCourses: (...args: any[]) => mockCategoryRead(...args),
  getCourse: (...args: any[]) => mockForbiddenCourseCall(...args),
  unpublishCourse: (...args: any[]) => mockForbiddenCourseCall(...args)
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
    mode: mockMode,
    limits: {},
    can: (capability: string) =>
      capability === "COURSES_VIEW" ||
      (capability === "SEE_PAID_COURSES" && mockPaidDiscovery)
  })
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/components/learning/AuthorizedCourseImage", () => () => null);
jest.mock("@/screens/CourseDetailScreen", () => () => null);
jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

function course(fields: Record<string, unknown> = {}, id = "catalog-course") {
  return Object.freeze({
    _id: id,
    title: `Course ${id}`,
    creator: "Independent educator",
    isPublished: true,
    rating: 0,
    ratingCount: 0,
    ...fields
  });
}

function recordSnapshot() {
  return JSON.stringify([mockPublicCourses, mockCommercialCourses]);
}

function supply(publicCourses: any[], commercialCourses: any[] = []) {
  mockPublicCourses = publicCourses;
  mockCommercialCourses = commercialCourses;
  recordsBefore = recordSnapshot();
}

function renderCategory() {
  return render(
    <CategoryCoursesScreen
      route={{ params: { category: "Plant care" } }}
      navigation={{ navigate: mockNavigate }}
    />
  );
}

async function settledShared() {
  const screen = render(<CoursesScreen />);
  await waitFor(() => expect(screen.queryByText("Loading courses...")).toBeNull());
  expect(mockApiRequest.mock.calls.map(([path]) => path)).toEqual([
    "/api/courses",
    "/api/commercial/courses/public"
  ]);
  return screen;
}

const labelCases = [
  [
    "conflicting public amounts",
    { access: "paid", priceCents: null, price: null },
    "Paid — price unavailable"
  ],
  ["legacy paid marker", { pricingType: "paid", price: 0 }, "Paid — price unavailable"],
  [
    "provider marker without amount",
    { stripePriceId: "price_synthetic", price: 0 },
    "Paid — price unavailable"
  ],
  ["saved cents preferred", { priceCents: 2500, price: 99 }, "$25.00"],
  ["legacy dollars", { priceCents: 0, price: "12.50" }, "$12.50"],
  ["ordinary zero free", { access: "free", priceCents: 0, price: 0 }, "Free"],
  ["invalid non-paid amount", { price: -1 }, "Price unavailable"]
] as const;

describe("R09-04T catalog price", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(mockAuth, {
      isAuthed: true,
      isHydrating: false,
      token: "synthetic-catalog-session",
      user: Object.freeze({
        id: "catalog-reader",
        plan: "free",
        aiTokens: 37,
        growInterests: {}
      })
    });
    mockPaidDiscovery = true;
    mockMode = "personal";
    supply([]);
    accountBefore = JSON.stringify(mockAuth);
    fetchGuard = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network forbidden"));
    mockForbiddenCourseCall.mockImplementation(() => {
      throw new Error("Non-catalog course call forbidden");
    });
    mockApiRequest.mockImplementation(async (path: string, options?: any) => {
      if (options?.method && options.method !== "GET") throw new Error("Write forbidden");
      if (path === "/api/courses") return { courses: mockPublicCourses };
      if (path === "/api/commercial/courses/public")
        return { courses: mockCommercialCourses };
      throw new Error("Unexpected catalog path");
    });
    mockCategoryRead.mockImplementation(async () => ({ data: mockPublicCourses }));
  });

  afterEach(() => {
    cleanup();
    try {
      expect(fetchGuard).not.toHaveBeenCalled();
      expect(mockForbiddenCourseCall).not.toHaveBeenCalled();
      expect(
        mockApiRequest.mock.calls.every(
          ([path, options]) =>
            ["/api/courses", "/api/commercial/courses/public"].includes(path) &&
            (!options?.method || options.method === "GET")
        )
      ).toBe(true);
      expect(JSON.stringify(mockAuth)).toBe(accountBefore);
      expect(recordSnapshot()).toBe(recordsBefore);
    } finally {
      fetchGuard.mockRestore();
    }
  });

  it.each(labelCases)("shared card: %s", async (_name, fields, expected) => {
    supply([course(fields)]);
    const screen = await settledShared();
    expect(screen.getByText(expected)).toBeTruthy();
    if (expected !== "Free") expect(screen.queryByText("Free")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByText(/Gift this course/)).toBeNull();
  });

  it.each(labelCases)("category card: %s", async (_name, fields, expected) => {
    supply([course(fields)]);
    const screen = renderCategory();
    await screen.findByText("Course catalog-course");
    expect(screen.getByText(expected)).toBeTruthy();
    if (expected !== "Free") expect(screen.queryByText(/^free$/i)).toBeNull();
    expect(mockCategoryRead).toHaveBeenCalledWith("Plant care");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each(["signed-in", "signed-out"])("free-only discovery: %s", async (session) => {
    mockPaidDiscovery = false;
    if (session === "signed-out") {
      Object.assign(mockAuth, { isAuthed: false, token: null, user: null });
      accountBefore = JSON.stringify(mockAuth);
    }
    supply([
      course({ price: 0 }, "free"),
      course({}, "legacy-free"),
      course({ access: "paid", price: null, priceCents: null }, "conflict"),
      course({ pricingType: "paid", price: 0 }, "legacy-paid"),
      course({ stripePriceId: "price_synthetic" }, "provider-paid"),
      course({ priceCents: 2500 }, "priced"),
      course({ price: -1 }, "invalid"),
      course({ price: "unknown" }, "malformed")
    ]);
    const screen = await settledShared();
    expect(screen.getByText("Course free")).toBeTruthy();
    expect(screen.getByText("Course legacy-free")).toBeTruthy();
    for (const id of [
      "conflict",
      "legacy-paid",
      "provider-paid",
      "priced",
      "invalid",
      "malformed"
    ]) {
      expect(screen.queryByText(`Course ${id}`)).toBeNull();
    }
    expect(screen.getAllByText("Free")).toHaveLength(2);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", { access: "paid", priceCents: null, price: null }],
    ["cents", { priceCents: 2500, price: 0 }],
    ["legacy marker", { pricingType: "paid", price: 0 }]
  ] as const)("category keeps paid discovery restricted: %s", async (_name, fields) => {
    mockPaidDiscovery = false;
    supply([course(fields)]);
    const screen = renderCategory();
    fireEvent.press(await screen.findByText("Course catalog-course"));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(/Sign in or refresh access/)).toBeTruthy();
  });

  it("category with paid discovery still opens the exact detail, not checkout", async () => {
    supply([course({ access: "paid", priceCents: null, price: null })]);
    const screen = renderCategory();
    fireEvent.press(await screen.findByText("Course catalog-course"));
    expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
    expect(mockNavigate.mock.calls).toEqual([["Course", { id: "catalog-course" }]]);
  });

  it("Facility cards retain server-scoped access without global catalog requests", async () => {
    mockMode = "facility";
    const item = course({
      facilityId: "facility-synthetic",
      authoringSource: "facility_workspace",
      access: "paid",
      priceCents: null,
      price: null,
      permissions: {}
    });
    const api = {
      list: jest.fn().mockResolvedValue({ courses: [item], permissions: {} }),
      get: jest.fn()
    };
    const screen = render(
      <CoursesScreen
        facilityWorkspace={{ facilityId: "facility-synthetic", role: "VIEWER", api }}
      />
    );
    await screen.findByText("Course catalog-course");
    expect(screen.getByText("Paid — price unavailable")).toBeTruthy();
    expect(screen.getByText("Facility workspace course")).toBeTruthy();
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Unpublish/ })).toBeNull();
  });

  it("keeps distinct shared and Commercial cards and their unavailable labels", async () => {
    supply(
      [course({ access: "paid", priceCents: null, price: null }, "shared")],
      [
        course(
          {
            access: "paid",
            price: null,
            sourceType: "commercial_course",
            storefrontSlug: "synthetic-educator"
          },
          "commercial"
        )
      ]
    );
    const screen = await settledShared();
    expect(screen.getAllByText("Paid — price unavailable")).toHaveLength(2);
    expect(screen.getByText("Course shared")).toBeTruthy();
    fireEvent.press(screen.getByText("Course commercial"));
    expect(mockPush.mock.calls).toEqual([
      ["/store/synthetic-educator/courses/commercial"]
    ]);
  });
});
