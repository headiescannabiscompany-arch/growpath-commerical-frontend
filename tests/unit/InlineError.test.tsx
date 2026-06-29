import React from "react";
import { render } from "@testing-library/react-native";

import { InlineError } from "../../src/components/InlineError";

describe("InlineError", () => {
  it("renders nothing for empty error state", () => {
    const screen = render(<InlineError error={null} />);

    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("renders the default title when an error object is present", () => {
    const screen = render(<InlineError error={{}} />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
