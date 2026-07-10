import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import PaymentHelpDialog from "@/components/PaymentHelpDialog";

describe("PaymentHelpDialog", () => {
  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses the GrowPath billing alias for payment help", () => {
    const onClose = jest.fn();
    const screen = render(<PaymentHelpDialog onClose={onClose} />);

    expect(screen.getByText("Payment Issues Help")).toBeTruthy();
    expect(screen.getByText("billing@growpathai.com")).toBeTruthy();
    expect(screen.queryByText("admin@growpath.ai")).toBeNull();

    fireEvent.press(screen.getByText("Email Support"));

    expect(Linking.openURL).toHaveBeenCalledWith(
      "mailto:billing@growpathai.com?subject=Payment%20Issue"
    );

    fireEvent.press(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
