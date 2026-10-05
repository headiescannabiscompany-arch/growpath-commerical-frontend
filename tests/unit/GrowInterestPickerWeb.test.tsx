/** @jest-environment jsdom */

import React, { act, useState } from "react";
import { Platform, TouchableOpacity } from "react-native";
import GrowInterestPicker from "@/components/GrowInterestPicker";

// Use the installed web implementation, including its DOM prop forwarding and
// press responder. A native host or hand-written button would hide this bug.
jest.mock("react-native", () => jest.requireActual("react-native-web"));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { growInterests: { crops: ["Vegetables", "Herbs"] } } })
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      border: "#444444",
      surface: "#ffffff",
      surfaceMuted: "#eeeeee",
      text: "#111111",
      textMuted: "#555555",
      warning: "#775500",
      accent: "#166534",
      accentText: "#ffffff"
    }
  })
}));

type Selection = Record<string, string[]>;

interface TestRoot {
  render(children: React.ReactNode): void;
  unmount(): void;
}

const { createRoot } = require("react-dom/client") as {
  createRoot(container: HTMLElement): TestRoot;
};

const initialSelection = (): Selection => ({
  crops: [],
  environment: ["Indoor"],
  methods: ["Living Soil / No-Till"]
});

describe("GrowInterestPicker with the installed React Native Web DOM", () => {
  let container: HTMLDivElement;
  let root: TestRoot;
  let onChange: jest.Mock;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onChange = jest.fn();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  function checkbox(option = "Vegetables"): HTMLElement {
    const element = container.querySelector<HTMLElement>(
      `[role="checkbox"][aria-label="Toggle grow interest ${option}"]`
    );
    expect(element).not.toBeNull();
    return element!;
  }

  function click(element: HTMLElement) {
    act(() => {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
  }

  function key(
    element: HTMLElement,
    type: "keydown" | "keyup",
    value: string,
    repeat = false
  ) {
    const event = new KeyboardEvent(type, {
      key: value,
      code:
        value === "Enter"
          ? "Enter"
          : value === " " || value === "Spacebar"
            ? "Space"
            : "ArrowDown",
      bubbles: true,
      cancelable: true,
      repeat
    });
    act(() => {
      element.dispatchEvent(event);
    });
    return event;
  }

  function renderControlled(value = initialSelection(), collapsible = false) {
    function ControlledPicker() {
      const [selection, setSelection] = useState(value);
      return (
        <GrowInterestPicker
          title="Course grow interests"
          helperText={undefined}
          tierOptionsOverride={undefined}
          value={selection}
          onChange={(next: Selection) => {
            onChange(next);
            setSelection(next);
          }}
          enabledTierIds={["crops", "environment"]}
          collapsible={collapsible}
          defaultExpanded={!collapsible}
        />
      );
    }
    act(() => root.render(<ControlledPicker />));
  }

  it("exposes explicit checked and unchecked states on real focusable web checkboxes", () => {
    expect(Platform.OS).toBe("web");
    expect(TouchableOpacity).toBe(
      jest.requireActual("react-native-web").TouchableOpacity
    );
    renderControlled({ ...initialSelection(), crops: ["Herbs"] });

    expect(checkbox().tagName).toBe("DIV");
    expect(checkbox().getAttribute("tabindex")).toBe("0");
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
    expect(checkbox("Herbs").getAttribute("aria-checked")).toBe("true");
    expect(checkbox("Indoor").getAttribute("aria-checked")).toBe("true");
    expect(
      container.querySelector('[aria-label="Toggle grow interest Cannabis"]')
    ).toBeNull();
  });

  it("toggles once per pointer click and preserves selections in other tiers", () => {
    const value = initialSelection();
    renderControlled(value);

    click(checkbox());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ ...value, crops: ["Vegetables"] });
    expect(checkbox().getAttribute("aria-checked")).toBe("true");

    click(checkbox());
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(value);
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
    expect(value.crops).toEqual([]);
    expect(value.environment).toEqual(["Indoor"]);
  });

  it.each([" ", "Spacebar"])(
    "toggles %j once, prevents scrolling, and ignores held-key repeats and keyup",
    (spaceKey) => {
      renderControlled();
      const element = checkbox();
      act(() => element.focus());

      expect(key(element, "keydown", spaceKey).defaultPrevented).toBe(true);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(checkbox().getAttribute("aria-checked")).toBe("true");
      expect(key(element, "keydown", spaceKey, true).defaultPrevented).toBe(true);
      expect(key(element, "keydown", spaceKey, true).defaultPrevented).toBe(true);
      key(element, "keyup", spaceKey);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(checkbox().getAttribute("aria-checked")).toBe("true");
      expect(document.activeElement).toBe(element);

      key(element, "keydown", spaceKey);
      key(element, "keyup", spaceKey);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(checkbox().getAttribute("aria-checked")).toBe("false");
    }
  );

  it("keeps Enter on the existing web press responder without a duplicate toggle", () => {
    renderControlled();
    const element = checkbox();
    act(() => element.focus());

    key(element, "keydown", "Enter");
    expect(onChange).not.toHaveBeenCalled();
    key(element, "keyup", "Enter");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(checkbox().getAttribute("aria-checked")).toBe("true");

    key(element, "keydown", "Enter");
    key(element, "keyup", "Enter");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
  });

  it("does not intercept unrelated keys or change the selection", () => {
    renderControlled();
    expect(key(checkbox(), "keydown", "ArrowDown").defaultPrevented).toBe(false);
    key(checkbox(), "keyup", "ArrowDown");
    expect(onChange).not.toHaveBeenCalled();
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
  });

  it("reflects external controlled values without emitting changes and preserves the latest other tiers", () => {
    function renderValue(value: Selection) {
      act(() =>
        root.render(
          <GrowInterestPicker
            helperText={undefined}
            tierOptionsOverride={undefined}
            value={value}
            onChange={onChange}
            enabledTierIds={["crops"]}
            collapsible={false}
          />
        )
      );
    }
    renderValue(initialSelection());
    expect(checkbox().getAttribute("aria-checked")).toBe("false");

    const replacement = {
      crops: ["Vegetables"],
      environment: ["Outdoor"],
      goals: ["Quality / Flavor-Focused"]
    };
    renderValue(replacement);
    expect(checkbox().getAttribute("aria-checked")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();

    click(checkbox());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...replacement, crops: [] });
    // A controlled picker must wait for its owner to supply the updated value.
    expect(checkbox().getAttribute("aria-checked")).toBe("true");
    expect(replacement.crops).toEqual(["Vegetables"]);
    renderValue({ ...replacement, crops: [] });
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
  });

  it("exposes the collapsed header state and toggles expansion without changing interests", () => {
    renderControlled(initialSelection(), true);
    const header = container.querySelector<HTMLElement>(
      '[role="button"][aria-label="Toggle Course grow interests"]'
    )!;
    expect(header).not.toBeNull();
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="checkbox"]')).toBeNull();

    click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(checkbox().getAttribute("aria-checked")).toBe("false");
    click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
