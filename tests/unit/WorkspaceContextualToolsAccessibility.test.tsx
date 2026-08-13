import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { href }),
    useRouter: () => ({ push: mockPush })
  };
});

import CommercialContextualTools from "@/components/commercial/CommercialContextualTools";
import FacilityContextualTools from "@/components/facility/FacilityContextualTools";

describe("workspace contextual tool accessibility", () => {
  beforeEach(() => mockPush.mockReset());

  it("exposes Commercial tool links under a heading with touch-sized targets", () => {
    const screen = render(
      <CommercialContextualTools
        title="Commercial record tools"
        tools={["diagnose"]}
        source="batch detail"
        batchId="batch-1"
      />
    );
    expect(screen.getByRole("header", { name: "Commercial record tools" })).toBeTruthy();
    const link = screen.getByLabelText("Plant Diagnose for batch detail");
    expect(StyleSheet.flatten(link.props.style)).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
    expect(link.props.href).toContain("batchId=batch-1");
  });

  it("exposes Facility tool links under a heading with touch-sized targets", () => {
    const screen = render(
      <FacilityContextualTools
        title="Facility record tools"
        tools={["diagnose"]}
        source="plant detail"
        facilityId="facility-1"
        plantId="plant-1"
      />
    );
    expect(screen.getByRole("header", { name: "Facility record tools" })).toBeTruthy();
    const link = screen.getByLabelText("Photo Diagnosis for plant detail");
    expect(StyleSheet.flatten(link.props.style)).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
    fireEvent.press(link);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("plantId=plant-1"));
  });
});
