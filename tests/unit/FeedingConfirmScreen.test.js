import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FeedingConfirmScreen from "@/screens/FeedingConfirmScreen";

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { FEEDING_SCHEDULE: "FEEDING_SCHEDULE" },
  useEntitlements: () => ({
    can: () => true
  })
}));

jest.mock("@/utils/proHelper", () => ({
  requireCapabilityAccess: (_navigation, _allowed, action) => action()
}));

describe("FeedingConfirmScreen", () => {
  it("labels scanned fertilizer values as label N-P2O5-K2O before scheduling", () => {
    const navigate = jest.fn();
    const nutrientData = {
      productName: "Bloom Mix",
      npk: { n: 3, p: 1, k: 1 },
      micros: { Ca: 4, Mg: 1 }
    };

    const screen = render(
      <FeedingConfirmScreen
        route={{ params: { nutrientData } }}
        navigation={{ navigate }}
      />
    );

    expect(screen.getByText("Label N-P2O5-K2O:")).toBeTruthy();
    expect(screen.getByText("3-1-1")).toBeTruthy();

    fireEvent.press(screen.getByText("Next"));

    expect(navigate).toHaveBeenCalledWith("FeedingScheduleOptions", { nutrientData });
  });
});
