import React, { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text, TextInput, View } from "react-native";

import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

let mockSelectedFacilityId: string | null = null;
let mockSelectedFacilityRecordId: string | null = null;

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: mockSelectedFacilityId,
    selected: mockSelectedFacilityRecordId
      ? { id: mockSelectedFacilityRecordId, name: mockSelectedFacilityRecordId }
      : null
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
});

function StatefulProbe({ facilityId }: { facilityId: string }) {
  const [draft, setDraft] = useState("");
  return (
    <View>
      <Text>{`Facility ${facilityId}`}</Text>
      <TextInput
        accessibilityLabel="Workspace draft"
        value={draft}
        onChangeText={setDraft}
      />
    </View>
  );
}

function Subject() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => <StatefulProbe facilityId={workspace.facilityId} />}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}

describe("Facility Business Desk workspace boundary", () => {
  beforeEach(() => {
    mockSelectedFacilityId = null;
    mockSelectedFacilityRecordId = null;
  });

  it("fails closed for missing or invalid Facility selection", () => {
    const screen = render(<Subject />);
    expect(screen.getByText("Facility workspace required")).toBeTruthy();
    expect(screen.queryByLabelText("Workspace draft")).toBeNull();

    mockSelectedFacilityId = "   ";
    mockSelectedFacilityRecordId = "   ";
    screen.rerender(<Subject />);
    expect(screen.getByText("Facility workspace required")).toBeTruthy();

    mockSelectedFacilityId = "bad\u0000facility";
    mockSelectedFacilityRecordId = "bad\u0000facility";
    screen.rerender(<Subject />);
    expect(screen.getByText("Facility workspace required")).toBeTruthy();

    mockSelectedFacilityId = "facility-new";
    mockSelectedFacilityRecordId = "facility-stale";
    screen.rerender(<Subject />);
    expect(screen.getByText("Facility workspace required")).toBeTruthy();
  });

  it("remounts and clears draft state when the selected Facility changes", () => {
    mockSelectedFacilityId = "facility-a";
    mockSelectedFacilityRecordId = "facility-a";
    const screen = render(<Subject />);
    fireEvent.changeText(screen.getByLabelText("Workspace draft"), "Facility A only");
    expect(screen.getByDisplayValue("Facility A only")).toBeTruthy();

    mockSelectedFacilityId = "facility-b";
    mockSelectedFacilityRecordId = "facility-b";
    screen.rerender(<Subject />);

    expect(screen.getByText("Facility facility-b")).toBeTruthy();
    expect(screen.getByLabelText("Workspace draft").props.value).toBe("");
    expect(screen.queryByText("Facility facility-a")).toBeNull();
  });
});
