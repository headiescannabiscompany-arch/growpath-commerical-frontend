import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import {
  RecordSaveArchiveActions,
  StatusSelector
} from "@/features/businessDesk/RecordFormControls";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, subtitle, children }: any) {
    return React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
  };
});

describe("Business Desk shared record controls", () => {
  it("shows a load failure without falsely claiming there are no records", () => {
    const screen = render(
      <RecordToolScaffold
        title="Job Notes"
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
        description="Workspace jobs"
        records={[]}
        selectedRecord={null}
        loading={false}
        error={new Error("Workspace records could not be loaded")}
        onRetry={jest.fn()}
        onNew={jest.fn()}
        onSelect={jest.fn()}
      >
        {null}
      </RecordToolScaffold>
    );

    expect(screen.getByText("Workspace records could not be loaded")).toBeTruthy();
    expect(screen.queryByText("No saved records yet.")).toBeNull();
  });

  it("keeps selection, refresh, and new-record actions explicit", () => {
    const onNew = jest.fn();
    const onRetry = jest.fn();
    const onSelect = jest.fn();
    const first = {
      _id: "record-1",
      kind: "job" as const,
      title: "First job",
      status: "requested",
      version: 2,
      payload: {}
    };
    const second = { ...first, _id: "record-2", title: "Second job", version: 1 };
    const screen = render(
      <RecordToolScaffold
        title="Job Notes"
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
        description="Workspace jobs"
        records={[first, second]}
        selectedRecord={first}
        loading={false}
        error={null}
        onRetry={onRetry}
        onNew={onNew}
        onSelect={onSelect}
      >
        {null}
      </RecordToolScaffold>
    );

    expect(
      screen.getByLabelText("Open job notes First job").props.accessibilityState.selected
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Open job notes Second job"));
    fireEvent.press(screen.getByLabelText("Start new job notes record"));
    fireEvent.press(screen.getByLabelText("Refresh job notes records"));

    expect(onSelect).toHaveBeenCalledWith(second);
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("hides archive for an unsaved record and reports selected statuses", () => {
    const onSave = jest.fn();
    const onArchive = jest.fn();
    const onArchiveReasonChange = jest.fn();
    const onStatusChange = jest.fn();
    const screen = render(
      <>
        <StatusSelector
          label="Lead status"
          value="new"
          options={[
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" }
          ]}
          onChange={onStatusChange}
        />
        <RecordSaveArchiveActions
          saving={false}
          hasRecord={false}
          saveLabel="Save lead"
          archiveReason=""
          onArchiveReasonChange={onArchiveReasonChange}
          onSave={onSave}
          onArchive={onArchive}
        />
      </>
    );

    expect(
      screen.getByLabelText("Lead status New").props.accessibilityState.checked
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Lead status Contacted"));
    fireEvent.press(screen.getByLabelText("Save lead"));
    expect(screen.queryByLabelText("Archive Business Desk record")).toBeNull();
    expect(onStatusChange).toHaveBeenCalledWith("contacted");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onArchive).not.toHaveBeenCalled();
  });
});
