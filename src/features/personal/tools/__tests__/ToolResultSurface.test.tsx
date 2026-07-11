import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import ToolResultSurface from "../ToolResultSurface";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

describe("ToolResultSurface", () => {
  beforeEach(() => {
    mockPush.mockReset();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      }
    });
  });

  it("renders canonical tool result sections and standard actions", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ToolResultSurface
          title="VPD result"
          status="IN RANGE"
          summary="Stage target is satisfied."
          metrics={[{ key: "vpd", label: "VPD", value: "1.20 kPa" }]}
          inputs={{ airTemp: 77, rh: 60 }}
          outputs={{ vpdKpa: 1.2, status: "in_range" }}
          notices={[
            {
              key: "sensor",
              severity: "info",
              message: "Verify sensor placement."
            }
          ]}
          recommendations={["Maintain current range."]}
          formulas={["VPD = SVP - AVP."]}
          uncertainty="Leaf temperature may differ from air temperature."
          confidence="server-calculated"
          onReuseInputs={jest.fn()}
          onAskAI={jest.fn()}
        />
      );
    });

    const text = tree!.root.findAllByType(Text).map((node: any) => node.props.children);
    expect(text.flat(Infinity).join(" ")).toContain("Inputs");
    expect(text.flat(Infinity).join(" ")).toContain("Outputs");
    expect(text.flat(Infinity).join(" ")).toContain("Formula / Why It Matters");
    expect(text.flat(Infinity).join(" ")).toContain("Uncertainty / Confidence");
    expect(text.flat(Infinity).join(" ")).toContain("Copy Result");
    expect(text.flat(Infinity).join(" ")).toContain("Reuse Inputs");
    expect(text.flat(Infinity).join(" ")).toContain("Ask AI About This");
  });

  it("opens personal AI with structured result context by default", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ToolResultSurface
          title="Dew Point Guard result"
          status="HIGH"
          summary="Condensation risk is elevated."
          metrics={[{ key: "spread", label: "Dew point spread", value: "1.2 C" }]}
          inputs={{ growId: "grow-1", rh: 82 }}
          outputs={{ risk: "high", dewPointSpreadC: 1.2 }}
          recommendations={["Inspect dense canopy zones."]}
        />
      );
    });

    const askButton = tree!.root
      .findAll((node: any) => node.props.accessibilityLabel === "Ask AI About This")
      .at(0);
    expect(askButton).toBeTruthy();

    await act(async () => {
      askButton?.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/home/personal/ai?prompt=")
    );
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("growId=grow-1"));
    const href = mockPush.mock.calls[0][0];
    expect(decodeURIComponent(href)).toContain("Dew Point Guard result");
    expect(decodeURIComponent(href)).toContain('"risk": "high"');
  });

  it("copies the structured result payload when the runtime supports clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { writeText } }
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ToolResultSurface
          title="NPK result"
          metrics={[{ key: "n", label: "N", value: "100" }]}
          inputs={{ amount: 5 }}
          outputs={{ ppmN: 100 }}
        />
      );
    });

    const copyButton = tree!.root
      .findAll((node: any) => node.props.accessibilityLabel === "Copy Result")
      .at(0);
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton?.props.onPress();
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"ppmN": 100'));
  });

  it("shows pending and success feedback for result actions", async () => {
    let resolveAction: () => void = () => {};
    const onPress = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        })
    );

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ToolResultSurface
          title="Action result"
          metrics={[{ key: "risk", label: "Risk", value: "low" }]}
          actions={[
            {
              key: "save",
              label: "Save Result",
              pendingLabel: "Saving...",
              successMessage: "Saved result.",
              onPress
            }
          ]}
        />
      );
    });

    const actionButton = tree!.root
      .findAll((node: any) => node.props.accessibilityLabel === "Save Result")
      .at(0);

    await act(async () => {
      actionButton?.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    let text = tree!.root.findAllByType(Text).map((node: any) => node.props.children);
    expect(text.flat(Infinity).join(" ")).toContain("Saving...");

    await act(async () => {
      resolveAction();
    });

    text = tree!.root.findAllByType(Text).map((node: any) => node.props.children);
    expect(text.flat(Infinity).join(" ")).toContain("Saved result.");
  });

  it("shows action error feedback without losing the result", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ToolResultSurface
          title="Action error result"
          metrics={[{ key: "risk", label: "Risk", value: "high" }]}
          actions={[
            {
              key: "save",
              label: "Save Result",
              onPress: async () => {
                throw new Error("Save failed.");
              }
            }
          ]}
        />
      );
    });

    const actionButton = tree!.root
      .findAll((node: any) => node.props.accessibilityLabel === "Save Result")
      .at(0);

    await act(async () => {
      actionButton?.props.onPress();
    });

    const text = tree!.root.findAllByType(Text).map((node: any) => node.props.children);
    expect(text.flat(Infinity).join(" ")).toContain("Action error result");
    expect(text.flat(Infinity).join(" ")).toContain("Save failed.");
  });
});
