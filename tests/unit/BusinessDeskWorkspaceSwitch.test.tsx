import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { listBusinessDeskRecords, type BusinessDeskWorkspace } from "@/api/businessDesk";
import { useBusinessDeskRecordCollection } from "@/features/businessDesk/recordWorkflow";

jest.mock("@/api/businessDesk", () => {
  const actual = jest.requireActual("@/api/businessDesk");
  return { ...actual, listBusinessDeskRecords: jest.fn() };
});

const mockList = listBusinessDeskRecords as jest.MockedFunction<
  typeof listBusinessDeskRecords
>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function Probe({ workspace }: { workspace: BusinessDeskWorkspace }) {
  const collection = useBusinessDeskRecordCollection(workspace, "lead");
  return (
    <Text>
      {collection.loading
        ? "Loading"
        : collection.records.map((record) => record.title).join(",") || "Empty"}
    </Text>
  );
}

function record(title: string) {
  return {
    id: title.toLowerCase().replace(/\s/g, "-"),
    kind: "lead" as const,
    title,
    status: "new",
    version: 1,
    payload: {}
  };
}

describe("Business Desk workspace switching", () => {
  beforeEach(() => mockList.mockReset());

  it("aborts and discards a delayed list response after Facility switch", async () => {
    const first = deferred<ReturnType<typeof record>[]>();
    const second = deferred<ReturnType<typeof record>[]>();
    mockList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const screen = render(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-a" }} />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    const firstSignal = mockList.mock.calls[0][2]?.signal;

    screen.rerender(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-b" }} />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    expect(screen.getByText("Loading")).toBeTruthy();

    await act(async () => first.resolve([record("Facility A lead")]));
    expect(screen.queryByText("Facility A lead")).toBeNull();
    expect(screen.getByText("Loading")).toBeTruthy();

    await act(async () => second.resolve([record("Facility B lead")]));
    await waitFor(() => expect(screen.getByText("Facility B lead")).toBeTruthy());
    expect(screen.queryByText("Facility A lead")).toBeNull();
  });
});
