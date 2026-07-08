import React from "react";
import { render } from "@testing-library/react-native";

import CommercialBanner from "../../src/components/CommercialBanner";

jest.mock("../../src/components/ContextBar.js", () => "ContextBar");

describe("CommercialBanner", () => {
  it("uses Forum/Q&A and storefront language instead of community or marketplace copy", () => {
    const personal = render(<CommercialBanner mode="personal" />);
    expect(
      personal.getByText("Featured: Try GrowPath Pro for advanced tools & Forum/Q&A!")
    ).toBeTruthy();
    expect(personal.queryByText(/community/i)).toBeNull();

    const commercial = render(<CommercialBanner mode="commercial" />);
    expect(
      commercial.getByText("Commercial: Manage your storefront and vendor tools!")
    ).toBeTruthy();
    expect(commercial.queryByText(/marketplace/i)).toBeNull();
  });
});
