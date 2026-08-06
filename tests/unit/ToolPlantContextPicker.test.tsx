import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { useToolPlantContext } from "@/features/personal/tools/ToolPlantContextPicker";

const mockListPersonalPlants = jest.fn();

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

function ContextProbe({ enabled }: { enabled: boolean }) {
  const context = useToolPlantContext(
    "personal-grow-secret",
    "personal-plant-secret",
    enabled
  );
  return (
    <Text>{`${context.plants.length}|${context.plantId || "none"}|${
      context.toolRunContext.plantId || "none"
    }`}</Text>
  );
}

describe("useToolPlantContext workspace isolation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalPlants.mockResolvedValue([
      { id: "personal-plant-secret", name: "Private plant" }
    ]);
  });

  it("does not load or expose Personal plants when the caller disables Personal context", async () => {
    const screen = render(<ContextProbe enabled={false} />);

    await waitFor(() => expect(screen.getByText("0|none|none")).toBeTruthy());
    expect(mockListPersonalPlants).not.toHaveBeenCalled();
  });

  it("still loads Personal plant context for an explicitly Personal workflow", async () => {
    const screen = render(<ContextProbe enabled />);

    await waitFor(() =>
      expect(mockListPersonalPlants).toHaveBeenCalledWith({
        growId: "personal-grow-secret"
      })
    );
    expect(
      await screen.findByText("1|personal-plant-secret|personal-plant-secret")
    ).toBeTruthy();
  });
});
