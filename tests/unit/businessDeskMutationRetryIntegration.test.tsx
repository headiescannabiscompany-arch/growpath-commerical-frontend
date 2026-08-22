import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import {
  archiveBusinessDeskRecord,
  COMMERCIAL_BUSINESS_DESK_WORKSPACE,
  createBusinessDeskRecord,
  listBusinessDeskRecords,
  updateBusinessDeskRecord,
  type BusinessDeskRecord
} from "@/api/businessDesk";
import { useBusinessDeskRecordCollection } from "@/features/businessDesk/recordWorkflow";

jest.mock("@/api/businessDesk", () => {
  const actual = jest.requireActual("@/api/businessDesk");
  return {
    ...actual,
    archiveBusinessDeskRecord: jest.fn(),
    createBusinessDeskRecord: jest.fn(),
    listBusinessDeskRecords: jest.fn(),
    updateBusinessDeskRecord: jest.fn()
  };
});

const mockArchive = archiveBusinessDeskRecord as jest.MockedFunction<
  typeof archiveBusinessDeskRecord
>;
const mockCreate = createBusinessDeskRecord as jest.MockedFunction<
  typeof createBusinessDeskRecord
>;
const mockList = listBusinessDeskRecords as jest.MockedFunction<
  typeof listBusinessDeskRecords
>;
const mockUpdate = updateBusinessDeskRecord as jest.MockedFunction<
  typeof updateBusinessDeskRecord
>;

const existingVendor: BusinessDeskRecord = {
  id: "vendor-1",
  kind: "vendor_comparison",
  title: "Compost vendors",
  status: "approved",
  version: 3,
  payload: { vendorComparison: { purchaseRequest: {} } }
};

function CreateLeadProbe() {
  const collection = useBusinessDeskRecordCollection(
    COMMERCIAL_BUSINESS_DESK_WORKSPACE,
    "lead"
  );
  return (
    <View>
      <Pressable
        accessibilityLabel="Save lead"
        onPress={() =>
          void collection
            .save({
              title: "Garden inquiry",
              status: "new",
              payload: { lead: { interest: "soil consultation" } }
            })
            .catch(() => undefined)
        }
      >
        <Text>Save</Text>
      </Pressable>
      {collection.error ? <Text>{collection.error.message}</Text> : null}
    </View>
  );
}

function VendorTransitionProbe({ current }: { current?: BusinessDeskRecord }) {
  const collection = useBusinessDeskRecordCollection(
    COMMERCIAL_BUSINESS_DESK_WORKSPACE,
    "vendor_comparison"
  );
  return (
    <View>
      <Pressable
        accessibilityLabel="Record vendor order"
        onPress={() =>
          void collection
            .transition(current || { ...existingVendor, id: undefined }, {
              status: "ordered",
              transitionEvidence: {
                orderOrigin: "manual_off_platform",
                externalOrderReference: "PO-100"
              }
            })
            .catch(() => undefined)
        }
      >
        <Text>Order</Text>
      </Pressable>
      {collection.error ? <Text>{collection.error.message}</Text> : null}
    </View>
  );
}

describe("Business Desk mutation retry integration", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCreate.mockReset();
    mockList.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
  });

  it("reuses the same create key after an ambiguous failure", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("Connection ended before the response"))
      .mockResolvedValueOnce({
        id: "lead-1",
        kind: "lead",
        title: "Garden inquiry",
        status: "new",
        version: 1,
        payload: { lead: { interest: "soil consultation" } }
      });
    const screen = render(<CreateLeadProbe />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText("Save lead"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await screen.findByText("Connection ended before the response");
    fireEvent.press(screen.getByLabelText("Save lead"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));

    const firstKey = mockCreate.mock.calls[0][1].idempotencyKey;
    const retryKey = mockCreate.mock.calls[1][1].idempotencyKey;
    expect(firstKey).toMatch(/^lead-create-/);
    expect(retryKey).toBe(firstKey);
  });

  it("retries a status-only transition without sending substantive fields", async () => {
    mockUpdate
      .mockRejectedValueOnce(new Error("Connection ended before transition response"))
      .mockResolvedValueOnce({ ...existingVendor, status: "ordered", version: 4 });
    const screen = render(<VendorTransitionProbe current={existingVendor} />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByLabelText("Record vendor order"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await screen.findByText("Connection ended before transition response");
    fireEvent.press(screen.getByLabelText("Record vendor order"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));

    const firstBody = mockUpdate.mock.calls[0][2];
    const retryBody = mockUpdate.mock.calls[1][2];
    expect(firstBody).toEqual({
      expectedVersion: 3,
      status: "ordered",
      transitionEvidence: {
        orderOrigin: "manual_off_platform",
        externalOrderReference: "PO-100"
      },
      idempotencyKey: expect.stringMatching(/^vendor_comparison-transition-/)
    });
    expect(retryBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(firstBody).not.toHaveProperty("title");
    expect(firstBody).not.toHaveProperty("payload");
    expect(firstBody).not.toHaveProperty("sourceLinks");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
