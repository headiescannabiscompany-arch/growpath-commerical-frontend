import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAiToolsRoute from "@/app/home/facility/(tabs)/ai-tools";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: any) => React.createElement(Text, null, String(href)),
    useLocalSearchParams: () => ({ toolRunId: "toolrun-1" })
  };
});

describe("FacilityAiToolsRoute", () => {
  it("consolidates the legacy second AI page into the command center", () => {
    const screen = render(<FacilityAiToolsRoute />);
    expect(screen.getByText("/home/facility/ai-ask?toolRunId=toolrun-1")).toBeTruthy();
  });
});
