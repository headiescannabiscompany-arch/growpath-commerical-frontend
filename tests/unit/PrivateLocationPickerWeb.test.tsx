/** @jest-environment jsdom */

import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";

import PrivateLocationPicker from "@/components/fieldStudies/PrivateLocationPicker.web";

jest.mock("@/components/fieldStudies/FieldObservationGlobe.web", () => ({
  fallbackStyle: jest.fn(() => ({})),
  loadMapLibreModule: jest.fn(() => new Promise(() => undefined)),
  safelyRemoveMapLibreMap: jest.fn()
}));

describe("PrivateLocationPicker web coordinate fallback", () => {
  it("stages a valid known point without implying that it has been saved", () => {
    const onChange = jest.fn();
    let tree: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<PrivateLocationPicker onChange={onChange} value={null} />);
    });
    const root = tree!.root;
    expect(
      root.findAll(
        (node: { children?: unknown[] }) =>
          typeof node.children?.[0] === "string" &&
          node.children[0].includes("are not saved until you choose Save Private Pin")
      )
    ).toHaveLength(1);
    act(() => {
      root.findByProps({ "aria-label": "Plant latitude" }).props.onChange({
        currentTarget: { value: "39.104070" }
      });
      root.findByProps({ "aria-label": "Plant longitude" }).props.onChange({
        currentTarget: { value: "-76.973493" }
      });
    });
    act(() => root.findByType("button").props.onClick());
    expect(onChange).toHaveBeenCalledWith({
      latitude: 39.10407,
      longitude: -76.973493
    });
  });

  it("rejects invalid coordinate text", () => {
    const onChange = jest.fn();
    let tree: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<PrivateLocationPicker onChange={onChange} value={null} />);
    });
    const root = tree!.root;
    act(() => {
      root.findByProps({ "aria-label": "Plant latitude" }).props.onChange({
        currentTarget: { value: "not-a-coordinate" }
      });
      root.findByProps({ "aria-label": "Plant longitude" }).props.onChange({
        currentTarget: { value: "-76.973493" }
      });
    });
    act(() => root.findByType("button").props.onClick());
    expect(root.findByProps({ role: "alert" }).children).toContain(
      "Enter a valid latitude and longitude."
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
