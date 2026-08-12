/** @jest-environment jsdom */

import React from "react";
import renderer, { act } from "react-test-renderer";

import FieldObservationGlobe from "@/components/fieldStudies/FieldObservationGlobe.web";

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      accent: "#2563eb",
      accentText: "#ffffff",
      border: "#334155",
      danger: "#dc2626",
      link: "#60a5fa",
      resolvedMode: "day",
      surface: "#ffffff",
      surfaceMuted: "#f1f5f9",
      text: "#0f172a",
      textMuted: "#475569"
    }
  })
}));

describe("FieldObservationGlobe web lifecycle", () => {
  it("retains the active map so geolocation and pin updates work", async () => {
    const easeTo = jest.fn();
    const setData = jest.fn();
    const setPaintProperty = jest.fn();
    const remove = jest.fn();
    const onSelectObservations = jest.fn();
    const onViewportChange = jest.fn();
    const getCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: 39.29, longitude: -76.61 } })
    );
    const handlers = new Map<
      string,
      Array<{ layer?: unknown; handler: (...args: any[]) => void }>
    >();

    class FakeMap {
      constructor(_options: unknown) {}
      addControl() {}
      addLayer() {}
      addSource() {}
      easeTo = easeTo;
      getBounds() {
        return {
          getWest: () => -130,
          getSouth: () => 20,
          getEast: () => -60,
          getNorth: () => 55
        };
      }
      getCanvas() {
        return { style: { cursor: "" } };
      }
      getLayer() {
        return { id: "growpath-observation-pins" };
      }
      getSource() {
        return { setData };
      }
      loaded() {
        return true;
      }
      off() {}
      on(event: string, layerOrHandler: unknown, maybeHandler?: () => void) {
        const handler =
          typeof layerOrHandler === "function"
            ? (layerOrHandler as () => void)
            : maybeHandler;
        if (handler) {
          handlers.set(event, [
            ...(handlers.get(event) || []),
            {
              layer: typeof layerOrHandler === "function" ? undefined : layerOrHandler,
              handler
            }
          ]);
        }
        return this;
      }
      remove = remove;
      setPaintProperty = setPaintProperty;
      setProjection() {}
    }

    Object.defineProperty(window, "__growpathMapLibre", {
      configurable: true,
      value: {
        Map: FakeMap,
        NavigationControl: class {},
        GlobeControl: class {},
        FullscreenControl: class {},
        GeolocateControl: class {}
      }
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition }
    });

    let tree: any;
    await act(async () => {
      tree = (renderer.create as any)(
        <FieldObservationGlobe
          observations={[]}
          onSelectObservations={onSelectObservations}
          onViewportChange={onViewportChange}
          selectedObservationId="observation-1"
        />,
        { createNodeMock: () => document.createElement("div") }
      );
      await Promise.resolve();
    });
    await act(async () => {
      handlers.get("load")?.forEach(({ handler }) => handler());
    });

    const locationButton = tree.root.find(
      (node: any) => node.type === "button" && node.props.children === "Use my location"
    );
    await act(async () => {
      locationButton.props.onClick();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-76.61, 39.29], zoom: 4.25 })
    );
    expect(setPaintProperty).toHaveBeenCalledWith(
      "growpath-observation-pins",
      "circle-radius",
      expect.any(Array)
    );

    await act(async () => {
      tree.update(
        <FieldObservationGlobe
          observations={[
            {
              id: "observation-2",
              location: { latitude: 38.9, longitude: -77.04 }
            }
          ]}
          onSelectObservations={onSelectObservations}
          onViewportChange={onViewportChange}
          selectedObservationId="observation-2"
        />
      );
    });
    expect(setData).toHaveBeenCalledWith(
      expect.objectContaining({
        features: [
          expect.objectContaining({
            properties: expect.objectContaining({ id: "observation-2" })
          })
        ]
      })
    );

    await act(async () => {
      handlers
        .get("click")
        ?.find(({ layer }) => layer === "growpath-observation-pins")
        ?.handler({ features: [{ properties: { id: "observation-2" } }] });
    });
    expect(onSelectObservations).toHaveBeenCalledWith(["observation-2"]);

    await act(async () => tree.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("does not crash navigation when WebKit has already cleared MapLibre's painter", async () => {
    const remove = jest.fn(() => {
      throw new TypeError(
        "undefined is not an object (evaluating 'this.painter.destroy')"
      );
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    class FakeMap {
      constructor(_options: unknown) {}
      addControl() {}
      loaded() {
        return true;
      }
      on() {
        return this;
      }
      remove = remove;
    }

    Object.defineProperty(window, "__growpathMapLibre", {
      configurable: true,
      value: {
        Map: FakeMap,
        NavigationControl: class {},
        GlobeControl: class {},
        FullscreenControl: class {},
        GeolocateControl: class {}
      }
    });

    let tree: any;
    await act(async () => {
      tree = (renderer.create as any)(
        <FieldObservationGlobe
          observations={[]}
          onSelectObservations={jest.fn()}
          onViewportChange={jest.fn()}
          selectedObservationId={undefined}
        />,
        { createNodeMock: () => document.createElement("div") }
      );
      await Promise.resolve();
    });

    await expect(
      act(async () => {
        tree.unmount();
      })
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[FieldObservationGlobe] map teardown was already incomplete:",
      expect.any(TypeError)
    );

    warn.mockRestore();
  });
});
