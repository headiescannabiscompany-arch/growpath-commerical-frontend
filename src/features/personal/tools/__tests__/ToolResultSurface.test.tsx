import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import ToolResultSurface from "../ToolResultSurface";

describe("ToolResultSurface", () => {
  beforeEach(() => {
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
    let tree: renderer.ReactTestRenderer;
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

    const text = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(text.flat(Infinity).join(" ")).toContain("Inputs");
    expect(text.flat(Infinity).join(" ")).toContain("Outputs");
    expect(text.flat(Infinity).join(" ")).toContain("Formula / Why It Matters");
    expect(text.flat(Infinity).join(" ")).toContain("Uncertainty / Confidence");
    expect(text.flat(Infinity).join(" ")).toContain("Copy Result");
    expect(text.flat(Infinity).join(" ")).toContain("Reuse Inputs");
    expect(text.flat(Infinity).join(" ")).toContain("Ask AI About This");
  });

  it("copies the structured result payload when the runtime supports clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { writeText } }
    });

    let tree: renderer.ReactTestRenderer;
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
      .findAll((node) => node.props.accessibilityLabel === "Copy Result")
      .at(0);
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton?.props.onPress();
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"ppmN": 100'));
  });
});
