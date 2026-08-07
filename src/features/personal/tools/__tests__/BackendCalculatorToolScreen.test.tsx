import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import BackendCalculatorToolScreen, {
  createBackendCalculatorStyles
} from "../BackendCalculatorToolScreen";
import { getThemePalette } from "@/theme/appTheme";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockGetGrowpathModuleRecord = jest.fn();
const mockUseEntitlements = jest.fn();
const mockAskPersonalAssistant = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockListFacilityGrows = jest.fn();
const mockFetchCommercialGrows = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1", plantId: "plant-1" }),
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/api/toolRuns", () => ({
  runCalculator: (...args: any[]) => mockRunCalculator(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args),
  getGrowpathModuleRecord: (...args: any[]) => mockGetGrowpathModuleRecord(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  listGrows: (...args: any[]) => mockListFacilityGrows(...args)
}));

jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialGrows: (...args: any[]) => mockFetchCommercialGrows(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockUseEntitlements()
}));

jest.mock("@/entitlements/LockedScreen", () => ({
  LockedScreen: ({ title, message }: any) => {
    const { Text } = require("react-native");
    return (
      <>
        <Text>{title}</Text>
        <Text>{message}</Text>
      </>
    );
  }
}));

jest.mock("@/components/feed/FeedBanner", () => ({
  __esModule: true,
  default: ({ placement }: any) => {
    const { Text } = require("react-native");
    return <Text>{`Feed banner ${placement}`}</Text>;
  }
}));

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children, showBack, backFallbackHref }: any) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        {showBack ? <Text>{`Shared Back ${backFallbackHref}`}</Text> : null}
        {children}
      </View>
    );
  }
}));

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => ({
  ToolPlantContextPicker: () => {
    const { Text } = require("react-native");
    return <Text>Plant context picker</Text>;
  },
  useToolPlantContext: () => ({
    plantId: "plant-1",
    plants: [{ id: "plant-1", name: "Plant 1" }],
    selectedPlant: { id: "plant-1", name: "Plant 1" },
    setPlantId: jest.fn(),
    toolRunContext: {
      plantId: "plant-1",
      selectedPlantContext: { plantId: "plant-1", displayName: "Plant 1" }
    }
  })
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn()
}));

function renderCloneRootingTool() {
  return render(
    <BackendCalculatorToolScreen
      tool="clone-rooting"
      toolKey="clone-rooting"
      title="Clone Rooting Troubleshooter"
      subtitle="Check clone rooting conditions."
      fields={[{ key: "cloneCount", label: "Clone count", defaultValue: "8" }]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        cloneCount: Number(values.cloneCount)
      })}
      defaultLogTitle={() => "Clone rooting check"}
    />
  );
}

describe("BackendCalculatorToolScreen beta access", () => {
  it("uses the active Night palette for the shared calculator surface", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createBackendCalculatorStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.guidanceCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.label.color).toBe(palette.text);
    expect(styles.button.backgroundColor).toBe(palette.accent);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-1" });
    mockGetGrowpathModuleRecord.mockResolvedValue({ id: "module-backend-1" });
    mockRunCalculator.mockResolvedValue({
      outputs: { rootingProgress: "normal_wait", warnings: [] },
      toolRun: {
        id: "tool-run-1",
        toolName: "clone-rooting",
        outputs: { rootingProgress: "normal_wait" }
      }
    });
    mockListPersonalGrows.mockResolvedValue([
      { id: "grow-1", name: "First grow" },
      { id: "grow-2", name: "Second grow" }
    ]);
    mockListFacilityGrows.mockResolvedValue([]);
    mockFetchCommercialGrows.mockResolvedValue([]);
  });

  it("locks beta packet tools for free personal users", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "free",
      can: jest.fn(() => true)
    });

    renderCloneRootingTool();

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(screen.getByText("Clone Rooting Troubleshooter is a Pro tool")).toBeTruthy();
    expect(screen.queryByText("Calculate")).toBeNull();
    expect(mockRunCalculator).not.toHaveBeenCalled();
  });

  it("lets the local paid preview flag run beta packet tools for free accounts", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "?paid=1" }
    });
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "free",
      can: jest.fn(() => false)
    });

    renderCloneRootingTool();

    expect(screen.queryByText("Clone Rooting Troubleshooter is a Pro tool")).toBeNull();
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalled());
  });

  it("lets pro personal users run beta packet tools", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });

    renderCloneRootingTool();

    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() => expect(mockRunCalculator).toHaveBeenCalled());
    expect(mockRunCalculator).toHaveBeenCalledWith(
      "clone-rooting",
      expect.objectContaining({
        growId: "grow-1",
        plantId: "plant-1",
        cloneCount: 8
      })
    );
    expect(
      await screen.findByText("Calculated and saved as a ToolRun and module record.")
    ).toBeTruthy();
  });

  it("reuses the backend-created module record instead of saving a duplicate", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    mockRunCalculator.mockResolvedValue({
      outputs: { rootingProgress: "normal_wait", warnings: [] },
      toolRun: {
        id: "tool-run-1",
        linkedModuleRecordId: "module-backend-1",
        toolName: "clone-rooting"
      }
    });

    renderCloneRootingTool();
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    await waitFor(() =>
      expect(mockGetGrowpathModuleRecord).toHaveBeenCalledWith("module-backend-1")
    );
    expect(mockCreateGrowpathModuleRecord).not.toHaveBeenCalled();
  });

  it("does not create a duplicate when the backend record is briefly unavailable", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    mockGetGrowpathModuleRecord.mockResolvedValue(null);
    mockRunCalculator.mockResolvedValue({
      outputs: { rootingProgress: "normal_wait", warnings: [] },
      toolRun: {
        id: "tool-run-1",
        linkedModuleRecordId: "module-backend-1",
        toolName: "clone-rooting"
      }
    });

    renderCloneRootingTool();
    fireEvent.press(screen.getByLabelText("Run Clone Rooting Troubleshooter"));

    expect(
      await screen.findByText(
        "Calculated and saved. The backend created the module record, but it could not be reloaded yet. Open Saved Runs before calculating again."
      )
    ).toBeTruthy();
    expect(mockCreateGrowpathModuleRecord).not.toHaveBeenCalled();
  });

  it("leaves empty AI values blank and counts only non-empty prefill fields", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        pestSeen: "not confirmed",
        evidence: [],
        scoutLocation: ""
      }),
      missingInformation: []
    });

    render(
      <BackendCalculatorToolScreen
        tool="ipm-scout"
        toolKey="ipm-scout"
        title="IPM Scout"
        subtitle="Review saved photo evidence."
        growOptional
        fields={[
          { key: "pestSeen", label: "Pest seen", defaultValue: "" },
          { key: "evidence", label: "Direct evidence", defaultValue: "" },
          { key: "scoutLocation", label: "Scout location", defaultValue: "" }
        ]}
        aiPrefill={{
          buttonLabel: "Test photo prefill",
          buildMessage: () => "Inspect the saved photo."
        }}
        buildPayload={(values) => values}
        defaultLogTitle={() => "IPM scout"}
      />
    );

    fireEvent.press(screen.getByText("Test photo prefill"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "AI filled 1 non-empty field from available evidence (Pest seen). Empty or unknown values were left blank. Fields marked AI draft remain unconfirmed until you review them."
        )
      ).toBeTruthy()
    );
    expect(
      screen.getByLabelText("Pest seen was filled by AI and needs review")
    ).toBeTruthy();
    expect(screen.getByLabelText("IPM Scout Pest seen").props.value).toBe(
      "not confirmed"
    );
    expect(screen.getByLabelText("IPM Scout Direct evidence").props.value).toBe("");
    expect(screen.getByLabelText("IPM Scout Scout location").props.value).toBe("");

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Pest seen"),
      "one slender insect directly observed"
    );
    expect(
      screen.queryByLabelText("Pest seen was filled by AI and needs review")
    ).toBeNull();

    fireEvent.press(screen.getByLabelText("Run IPM Scout"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "ipm-scout",
        expect.objectContaining({
          pestSeen: "one slender insect directly observed",
          fieldProvenance: expect.objectContaining({
            pestSeen: "visual_prefill_user_reviewed"
          }),
          userEnteredFields: [],
          aiPrefillProvenance: expect.objectContaining({
            prefilledFields: [],
            userReviewedFields: ["pestSeen"],
            userEditedFields: ["pestSeen"]
          })
        })
      )
    );
  });

  it("preserves explicit user observations while marking only AI-filled fields as drafts", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: JSON.stringify({
        cropContext: "AI guessed crop",
        leafDamage: "visible silver streaking"
      })
    });

    render(
      <BackendCalculatorToolScreen
        tool="ipm-scout"
        toolKey="ipm-scout"
        title="IPM Scout"
        subtitle="Review saved photo evidence."
        growOptional
        fields={[
          { key: "cropContext", label: "Crop context", defaultValue: "" },
          { key: "leafDamage", label: "Leaf damage", defaultValue: "" }
        ]}
        aiPrefill={{
          buttonLabel: "Test protected prefill",
          preserveAllExistingFields: true,
          buildMessage: ({ values }) => JSON.stringify(values)
        }}
        buildPayload={(values) => values}
        defaultLogTitle={() => "IPM scout"}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Crop context"),
      "user-recorded tomato, flowering"
    );
    fireEvent.press(screen.getByText("Test protected prefill"));

    await waitFor(() =>
      expect(screen.getByLabelText("IPM Scout Leaf damage").props.value).toBe(
        "visible silver streaking"
      )
    );
    expect(screen.getByLabelText("IPM Scout Crop context").props.value).toBe(
      "user-recorded tomato, flowering"
    );
    expect(
      screen.queryByLabelText("Crop context was filled by AI and needs review")
    ).toBeNull();
    expect(
      screen.getByLabelText("Leaf damage was filled by AI and needs review")
    ).toBeTruthy();
  });

  it("records manual fields in provenance even before any AI prefill", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    render(
      <BackendCalculatorToolScreen
        tool="harvest-readiness"
        toolKey="harvest-readiness"
        title="Harvest Readiness"
        subtitle="Review manual values."
        fields={[
          { key: "clearPercent", label: "Clear percent", defaultValue: "" },
          { key: "cloudyPercent", label: "Cloudy percent", defaultValue: "" },
          { key: "amberPercent", label: "Amber percent", defaultValue: "" }
        ]}
        buildPayload={(values) => values}
        defaultLogTitle={() => "Harvest readiness"}
      />
    );
    fireEvent.changeText(screen.getByLabelText("Harvest Readiness Clear percent"), "20");
    fireEvent.press(screen.getByLabelText("Run Harvest Readiness"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "harvest-readiness",
        expect.objectContaining({
          clearPercent: "20",
          fieldProvenance: { clearPercent: "user_reported" },
          userEnteredFields: ["clearPercent"]
        })
      )
    );
  });

  it("invalidates completed and in-flight AI drafts when the grow changes", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });
    let resolveAssistant: (value: any) => void = () => {};
    mockAskPersonalAssistant.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAssistant = resolve;
        })
    );
    render(
      <BackendCalculatorToolScreen
        tool="ipm-scout"
        toolKey="ipm-scout"
        title="IPM Scout"
        subtitle="Review saved evidence."
        fields={[{ key: "leafDamage", label: "Leaf damage", defaultValue: "" }]}
        aiPrefill={{
          buttonLabel: "Inspect evidence",
          buildMessage: () => "Inspect this evidence."
        }}
        buildPayload={(values) => values}
        defaultLogTitle={() => "IPM scout"}
      />
    );
    await waitFor(() => expect(screen.getByText("Second grow")).toBeTruthy());
    fireEvent.press(screen.getByText("Inspect evidence"));
    fireEvent.press(screen.getByLabelText("Select grow Second grow"));
    resolveAssistant({
      success: true,
      reply: JSON.stringify({ leafDamage: "silver streaking" })
    });
    await waitFor(() =>
      expect(screen.getByLabelText("IPM Scout Leaf damage").props.value).toBe("")
    );
    expect(
      screen.queryByLabelText("Leaf damage was filled by AI and needs review")
    ).toBeNull();
    expect(mockRunCalculator).not.toHaveBeenCalled();
  });

  it("applies external AI drafts additively and clears only unreviewed fields when evidence changes", async () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      plan: "pro",
      can: jest.fn(() => true)
    });

    const fields = [
      { key: "cropContext", label: "Crop context", defaultValue: "" },
      { key: "leafDamage", label: "Leaf damage", defaultValue: "" },
      { key: "scoutLocation", label: "Scout location", defaultValue: "" }
    ];
    const renderTool = (scopeKey: string, externalAiDraft: any) => (
      <BackendCalculatorToolScreen
        tool="ipm-scout"
        toolKey="ipm-scout"
        title="IPM Scout"
        subtitle="Review saved photo evidence."
        growOptional
        fields={fields}
        externalAiDraftScopeKey={scopeKey}
        externalAiDraft={externalAiDraft}
        buildPayload={(values) => values}
        defaultLogTitle={() => "IPM scout"}
      />
    );
    const view = render(renderTool("scope-1", null));

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Crop context"),
      "user-recorded tomato"
    );
    view.rerender(
      renderTool("scope-1", {
        scopeKey: "scope-1",
        revisionKey: "analysis-1::receipt-1",
        growId: "grow-1",
        values: {
          cropContext: "AI guessed crop",
          leafDamage: "silver streaking",
          scoutLocation: "lower canopy"
        },
        metadata: { photoAnalysis: { analysisId: "analysis-1" } }
      })
    );

    await waitFor(() =>
      expect(screen.getByLabelText("IPM Scout Leaf damage").props.value).toBe(
        "silver streaking"
      )
    );
    expect(screen.getByLabelText("IPM Scout Crop context").props.value).toBe(
      "user-recorded tomato"
    );
    expect(screen.getByLabelText("IPM Scout Scout location").props.value).toBe(
      "lower canopy"
    );
    expect(
      screen.getByLabelText("Leaf damage was filled by AI and needs review")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Leaf damage"),
      "user confirmed silver streaking"
    );
    view.rerender(renderTool("scope-2", null));

    await waitFor(() =>
      expect(screen.getByLabelText("IPM Scout Scout location").props.value).toBe("")
    );
    expect(screen.getByLabelText("IPM Scout Crop context").props.value).toBe(
      "user-recorded tomato"
    );
    expect(screen.getByLabelText("IPM Scout Leaf damage").props.value).toBe(
      "user confirmed silver streaking"
    );
    expect(
      screen.queryByLabelText("Leaf damage was filled by AI and needs review")
    ).toBeNull();

    fireEvent.press(screen.getByLabelText("Run IPM Scout"));
    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "ipm-scout",
        expect.objectContaining({
          cropContext: "user-recorded tomato",
          leafDamage: "user confirmed silver streaking",
          scoutLocation: "",
          fieldProvenance: expect.objectContaining({
            leafDamage: "visual_prefill_user_reviewed"
          }),
          aiPrefillProvenance: expect.objectContaining({
            prefilledFields: [],
            userReviewedFields: expect.arrayContaining(["leafDamage"])
          })
        })
      )
    );
    expect(mockRunCalculator.mock.calls.at(-1)?.[1]).not.toHaveProperty("photoAnalysis");
  });
});
