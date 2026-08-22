import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  listBusinessDeskRecords,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { useAuthorizedBusinessDeskRecords } from "@/features/businessDesk/AuthorizedRelatedRecordPicker";

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

function quote(title: string, id: string): BusinessDeskRecord {
  return {
    id,
    kind: "quote",
    title,
    status: "reviewed",
    version: 1,
    payload: {}
  };
}

function Probe({ workspace }: { workspace: BusinessDeskWorkspace }) {
  const related = useAuthorizedBusinessDeskRecords(workspace, ["quote"]);
  return (
    <Text>
      {related.loading
        ? "Loading"
        : related.records.map((record) => record.title).join(",") || "Empty"}
    </Text>
  );
}

describe("authorized Business Desk related records", () => {
  beforeEach(() => mockList.mockReset());

  it("aborts and discards a delayed related-record response after Facility switch", async () => {
    const first = deferred<BusinessDeskRecord[]>();
    const second = deferred<BusinessDeskRecord[]>();
    mockList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const screen = render(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-a" }} />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    expect(mockList.mock.calls[0][1]).toEqual({});
    const firstSignal = mockList.mock.calls[0][2]?.signal;

    screen.rerender(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-b" }} />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);

    await act(async () =>
      first.resolve([quote("Facility A quote", "64b000000000000000000301")])
    );
    expect(screen.queryByText("Facility A quote")).toBeNull();
    expect(screen.getByText("Loading")).toBeTruthy();

    await act(async () =>
      second.resolve([quote("Facility B quote", "64b000000000000000000302")])
    );
    await waitFor(() => expect(screen.getByText("Facility B quote")).toBeTruthy());
    expect(screen.queryByText("Facility A quote")).toBeNull();
  });

  it("filters archived and non-allowed records before they reach a picker", async () => {
    mockList.mockResolvedValue([
      quote("Allowed quote", "64b000000000000000000303"),
      {
        ...quote("Archived quote", "64b000000000000000000304"),
        archivedAt: "2026-08-22T12:00:00.000Z"
      },
      {
        ...quote("Wrong kind", "64b000000000000000000305"),
        kind: "lead"
      }
    ]);

    const screen = render(<Probe workspace={{ workspaceType: "commercial" }} />);
    await waitFor(() => expect(screen.getByText("Allowed quote")).toBeTruthy());
    expect(screen.queryByText(/Archived quote/)).toBeNull();
    expect(screen.queryByText(/Wrong kind/)).toBeNull();
  });
});
