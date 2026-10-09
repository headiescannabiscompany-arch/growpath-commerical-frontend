/** @jest-environment jsdom */

import React, { act } from "react";
import { Platform, Pressable } from "react-native";

import CommercialEvidenceRunDetailRoute from "@/app/home/commercial/evidence-runs/[id]";
import CommercialEvidenceRunsRoute from "@/app/home/commercial/evidence-runs";
import CommercialTrialsRoute from "@/app/home/commercial/trials";

const mockFetchCommercialGrow = jest.fn();
const mockFetchCommercialGrows = jest.fn();
const mockCreateCommercialGrow = jest.fn();
const mockUpdateCommercialGrow = jest.fn();
const mockFetchProducts = jest.fn();
const mockFetchProductLines = jest.fn();
const mockFetchSoilNutrientBatches = jest.fn();
const mockFetchProductTrials = jest.fn();
const mockFetchProductTrialEvidenceRuns = jest.fn();
const mockCreateProductTrial = jest.fn();

// Native host-prop assertions cannot verify React Native Web's DOM forwarding.
jest.mock("react-native", () => jest.requireActual("react-native-web"));
jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialGrow: (...args: any[]) => mockFetchCommercialGrow(...args),
  fetchCommercialGrows: (...args: any[]) => mockFetchCommercialGrows(...args),
  createCommercialGrow: (...args: any[]) => mockCreateCommercialGrow(...args),
  updateCommercialGrow: (...args: any[]) => mockUpdateCommercialGrow(...args),
  fetchProducts: (...args: any[]) => mockFetchProducts(...args),
  fetchProductLines: (...args: any[]) => mockFetchProductLines(...args),
  fetchSoilNutrientBatches: (...args: any[]) => mockFetchSoilNutrientBatches(...args),
  fetchProductTrials: (...args: any[]) => mockFetchProductTrials(...args),
  fetchProductTrialEvidenceRuns: (...args: any[]) =>
    mockFetchProductTrialEvidenceRuns(...args),
  createProductTrial: (...args: any[]) => mockCreateProductTrial(...args)
}));
jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => ({ id: "grow-1" })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { email: "owner@example.com" } })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: "commercial" })
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      border: "#444444",
      surface: "#ffffff",
      surfaceMuted: "#eeeeee",
      text: "#111111",
      textMuted: "#555555",
      warning: "#775500",
      accent: "#166534",
      accentText: "#ffffff"
    }
  })
}));
jest.mock("@/components/commercial/CommercialContextualTools", () => () => null);
jest.mock("@/components/integrations/GrowIntegrationBuildPanel", () => () => null);
jest.mock("@/utils/exportVisualTimeline", () => ({ exportVisualTimeline: jest.fn() }));
jest.mock("@/components/layout/AppPage", () => ({ header, children }: any) => (
  <>
    {header}
    {children}
  </>
));
jest.mock(
  "@/components/layout/AppCard",
  () =>
    ({ children }: any) =>
      children
);

interface TestRoot {
  render(children: React.ReactNode): void;
  unmount(): void;
}

const { createRoot } = require("react-dom/client") as {
  createRoot(container: HTMLElement): TestRoot;
};

const initialRecord = () => ({
  id: "grow-1",
  name: "Private synthetic evidence run",
  purpose: "product_trial",
  cropType: "tomato",
  status: "active",
  publicShareStatus: "private",
  notes: "Synthetic acceptance notes"
});

describe("Commercial Evidence Run web accessibility", () => {
  let container: HTMLDivElement;
  let root: TestRoot;
  let savedRecord: ReturnType<typeof initialRecord>;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    savedRecord = initialRecord();
    mockFetchCommercialGrow.mockImplementation(async () => ({ ...savedRecord }));
    mockFetchCommercialGrows.mockResolvedValue([]);
    mockFetchProducts.mockResolvedValue([]);
    mockFetchProductLines.mockResolvedValue([]);
    mockFetchSoilNutrientBatches.mockResolvedValue([]);
    mockFetchProductTrials.mockResolvedValue([]);
    mockFetchProductTrialEvidenceRuns.mockResolvedValue([initialRecord()]);
    mockUpdateCommercialGrow.mockImplementation(async (_id, fields) => {
      savedRecord = { ...savedRecord, ...fields };
      return { ...savedRecord };
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  async function renderRoute(detail = true) {
    await act(async () => {
      root.render(
        detail ? <CommercialEvidenceRunDetailRoute /> : <CommercialEvidenceRunsRoute />
      );
    });
  }

  function named(label: string): HTMLElement {
    const element = container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
    expect(element).not.toBeNull();
    return element!;
  }

  async function click(label: string) {
    await act(async () => {
      named(label).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });
  }

  function expectSelection(groupLabel: string, selectedLabel: string) {
    const radios = Array.from(named(groupLabel).querySelectorAll('[role="radio"]'));
    expect(radios.length).toBeGreaterThan(1);
    expect(
      radios.filter((radio) => radio.getAttribute("aria-checked") === "true")
    ).toHaveLength(1);
    for (const radio of radios) {
      expect(radio.getAttribute("aria-checked")).toBe(
        radio.getAttribute("aria-label") === selectedLabel ? "true" : "false"
      );
    }
  }

  it("exposes the create form's default and changed privacy without creating a record", async () => {
    expect(Platform.OS).toBe("web");
    expect(Pressable).toBe(jest.requireActual("react-native-web").Pressable);
    await renderRoute(false);

    const group = "Product trial evidence run public share status";
    expectSelection(group, "Public share status: Evidence building");
    await click("Public share status: Private");
    expectSelection(group, "Public share status: Private");
    await click("Public share status: Public ready");
    expectSelection(group, "Public share status: Public ready");
    expect(mockCreateCommercialGrow).not.toHaveBeenCalled();
    expect(mockUpdateCommercialGrow).not.toHaveBeenCalled();
  });

  it("reflects saved detail choices, deliberate local changes, and saved values after reopening", async () => {
    await renderRoute();
    const statusGroup = "Product trial evidence run detail status";
    const privacyGroup = "Product trial evidence run detail public share status";
    expectSelection(statusGroup, "Evidence run status: Active");
    expectSelection(privacyGroup, "Evidence run public share status: Private");
    expect(container.querySelectorAll('[role="heading"][aria-level="1"]')).toHaveLength(
      1
    );

    await click("Evidence run status: Completed");
    await click("Evidence run public share status: Evidence building");
    expectSelection(statusGroup, "Evidence run status: Completed");
    expectSelection(privacyGroup, "Evidence run public share status: Evidence building");
    expect(mockUpdateCommercialGrow).not.toHaveBeenCalled();

    await click("Evidence run public share status: Private");
    await click("Save product trial evidence run detail");
    expect(mockUpdateCommercialGrow).toHaveBeenCalledTimes(1);
    expect(mockUpdateCommercialGrow).toHaveBeenCalledWith(
      "grow-1",
      expect.objectContaining({ status: "completed", publicShareStatus: "private" })
    );
    await act(async () => root.render(null));
    await renderRoute();
    expectSelection(statusGroup, "Evidence run status: Completed");
    expectSelection(privacyGroup, "Evidence run public share status: Private");
  });

  it("exposes the archived/private record's saved states without a write", async () => {
    savedRecord.status = "archived";
    await renderRoute();
    expectSelection(
      "Product trial evidence run detail status",
      "Evidence run status: Archived"
    );
    expectSelection(
      "Product trial evidence run detail public share status",
      "Evidence run public share status: Private"
    );
    expect(mockUpdateCommercialGrow).not.toHaveBeenCalled();
  });

  it("exposes the ordinary trial's readable evidence link and unlinked radio states without saving", async () => {
    await act(async () => root.render(<CommercialTrialsRoute />));
    const group = "Trial evidence run choices";
    const unlinked = "Trial evidence run: Not linked yet";
    const linked = "Trial evidence run: Private synthetic evidence run";
    expectSelection(group, unlinked);
    await click(linked);
    expectSelection(group, linked);
    await click(unlinked);
    expectSelection(group, unlinked);
    expect(mockCreateProductTrial).not.toHaveBeenCalled();
    expect(mockUpdateCommercialGrow).not.toHaveBeenCalled();
  });

  it.each([
    ["Evidence run product", "Synthetic product", "Evidence run product line"],
    ["Evidence run product line", "Synthetic line", "Evidence run product"]
  ])(
    "exposes %s linking and unlinking without changing the other picker",
    async (label, recordName, otherLabel) => {
      mockFetchProducts.mockResolvedValue([
        { id: "product-1", name: "Synthetic product" }
      ]);
      mockFetchProductLines.mockResolvedValue([{ id: "line-1", name: "Synthetic line" }]);
      await renderRoute(false);

      const group = `${label} choices`;
      const unlinked = `${label}: Not linked yet`;
      const linked = `${label}: ${recordName}`;
      expectSelection(group, unlinked);
      await click(linked);
      expectSelection(group, linked);
      expectSelection(`${otherLabel} choices`, `${otherLabel}: Not linked yet`);
      await click(unlinked);
      expectSelection(group, unlinked);
      expect(mockCreateCommercialGrow).not.toHaveBeenCalled();
      expect(mockUpdateCommercialGrow).not.toHaveBeenCalled();
    }
  );

  it("exposes selected and unselected hat concepts when the local choice changes without creating a trial", async () => {
    await act(async () => root.render(<CommercialTrialsRoute />));
    const midnight = "GrowPathAI Circuit Leaf — Midnight";
    const sage = "GrowPathAI Circuit Leaf — Tonal Sage";
    expect(named(midnight).getAttribute("role")).toBe("radio");
    expect(named(sage).getAttribute("role")).toBe("radio");
    expect(named(midnight).getAttribute("aria-checked")).toBe("true");
    expect(named(sage).getAttribute("aria-checked")).toBe("false");
    await click(sage);
    expect(named(midnight).getAttribute("aria-checked")).toBe("false");
    expect(named(sage).getAttribute("aria-checked")).toBe("true");
    await click(midnight);
    expect(named(midnight).getAttribute("aria-checked")).toBe("true");
    expect(named(sage).getAttribute("aria-checked")).toBe("false");
    expect(mockCreateProductTrial).not.toHaveBeenCalled();
  });
});
