import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialInventoryCreateRoute from "@/app/home/commercial/inventory-create";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    commercial: {
      inventory: "/api/commercial/inventory"
    }
  }
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

describe("CommercialInventoryCreateRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({ id: "inventory-1" });
  });

  it("creates commercial inventory with item type, location, and linked records", async () => {
    const screen = render(<CommercialInventoryCreateRoute />);

    expect(screen.getByText(/Commercial inventory supports stock/)).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item name"),
      "Veg Mix Bag"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item SKU"),
      "VEG-001"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item quantity"),
      "12"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial inventory item unit"), "bags");
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item reorder point"),
      "4"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item vendor"),
      "Living Soil Labs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item category"),
      "soil"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item type"),
      "product"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item location"),
      "Rack A"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked product"),
      "product-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked ingredient"),
      "ingredient-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked genetics"),
      "genetics-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked grow"),
      "grow-1"
    );

    fireEvent.press(screen.getByLabelText("Create commercial inventory item"));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/inventory", {
        method: "POST",
        body: expect.objectContaining({
          name: "Veg Mix Bag",
          sku: "VEG-001",
          quantity: 12,
          unit: "bags",
          reorderPoint: 4,
          vendor: "Living Soil Labs",
          category: "soil",
          itemType: "product",
          location: "Rack A",
          linkedProductId: "product-1",
          linkedIngredientId: "ingredient-1",
          linkedGeneticsId: "genetics-1",
          linkedGrowId: "grow-1"
        })
      });
      expect(mockReplace).toHaveBeenCalledWith("/home/commercial/inventory");
    });
  });
});
