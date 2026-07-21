import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import BackendCalculatorToolScreen from "../BackendCalculatorToolScreen";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockUseEntitlements = jest.fn();
const mockAskPersonalAssistant = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1", plantId: "plant-1" }),
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/api/toolRuns", () => ({
  runCalculator: (...args: any[]) => mockRunCalculator(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
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
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-1" });
    mockRunCalculator.mockResolvedValue({
      outputs: { rootingProgress: "normal_wait", warnings: [] },
      toolRun: {
        id: "tool-run-1",
        toolName: "clone-rooting",
        outputs: { rootingProgress: "normal_wait" }
      }
    });
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
          "AI filled 1 non-empty field from available evidence. Empty or unknown values were left blank. Review before calculating."
        )
      ).toBeTruthy()
    );
    expect(screen.getByLabelText("IPM Scout Pest seen").props.value).toBe(
      "not confirmed"
    );
    expect(screen.getByLabelText("IPM Scout Direct evidence").props.value).toBe("");
    expect(screen.getByLabelText("IPM Scout Scout location").props.value).toBe("");
  });
});
