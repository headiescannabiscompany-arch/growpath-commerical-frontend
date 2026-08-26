/** @jest-environment jsdom */

import React from "react";
import renderer, { act } from "react-test-renderer";

import FieldObservationGlobe, {
  focusMapOnObservations,
  groupObservationsByPublicCoordinate,
  maintainMapLibreControlAccessibleNames,
  observationsToGeoJson
} from "@/components/fieldStudies/FieldObservationGlobe.web";

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
  it("groups separate observations at one privacy-safe park point into one marker", () => {
    expect(
      groupObservationsByPublicCoordinate([
        {
          id: "milkweed",
          location: { latitude: 39.1, longitude: -76.97, precision: "approximate" }
        },
        {
          id: "water-lily",
          location: { latitude: 39.1, longitude: -76.97, precision: "approximate" }
        },
        {
          id: "cary",
          location: { latitude: 35.78, longitude: -78.78, precision: "approximate" }
        }
      ] as any)
    ).toEqual([
      {
        coordinates: [-76.97, 39.1],
        key: "-76.97:39.1",
        observationIds: ["milkweed", "water-lily"],
        precision: "approximate"
      },
      {
        coordinates: [-78.78, 35.78],
        key: "-78.78:35.78",
        observationIds: ["cary"],
        precision: "approximate"
      }
    ]);
  });

  it("focuses coincident park observations as one visible cluster destination", () => {
    const easeTo = jest.fn();
    const fitBounds = jest.fn();
    const focused = focusMapOnObservations({ easeTo, fitBounds }, [
      { id: "milkweed", location: { latitude: 39.1, longitude: -76.97 } },
      { id: "water-lily", location: { latitude: 39.1, longitude: -76.97 } }
    ] as any);

    expect(focused).toBe(true);
    expect(easeTo).toHaveBeenCalledWith({
      center: [-76.97, 39.1],
      duration: 700,
      zoom: 9.5
    });
    expect(fitBounds).not.toHaveBeenCalled();
  });

  it("fits geographically separate observation results without over-zooming", () => {
    const easeTo = jest.fn();
    const fitBounds = jest.fn();
    const focused = focusMapOnObservations({ easeTo, fitBounds }, [
      { id: "maryland", location: { latitude: 39.1, longitude: -76.97 } },
      { id: "cary", location: { latitude: 35.78, longitude: -78.78 } }
    ] as any);

    expect(focused).toBe(true);
    expect(fitBounds).toHaveBeenCalledWith(
      [
        [-78.78, 35.78],
        [-76.97, 39.1]
      ],
      { duration: 700, maxZoom: 9.5, padding: 56 }
    );
    expect(easeTo).not.toHaveBeenCalled();
  });

  it("maps only complete bounded public coordinate pairs", () => {
    const geoJson = observationsToGeoJson([
      {
        id: "valid",
        location: { latitude: 39.301, longitude: -76.721 }
      },
      {
        id: "null-is-not-zero",
        location: { latitude: null, longitude: null }
      },
      {
        id: "missing-half",
        location: { latitude: 39.301 }
      },
      {
        id: "out-of-range",
        location: { latitude: 91, longitude: -181 }
      }
    ] as any);

    expect(geoJson.features).toEqual([
      expect.objectContaining({
        id: "valid",
        geometry: expect.objectContaining({ coordinates: [-76.721, 39.301] })
      })
    ]);
  });

  it("gives MapLibre controls an accessible name and keeps changing titles synchronized", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="maplibregl-ctrl">
        <button class="maplibregl-ctrl-globe-enabled" title="Disable globe"></button>
      </div>
    `;
    const button = container.querySelector("button") as HTMLButtonElement;

    const stop = maintainMapLibreControlAccessibleNames(container);
    expect(button.getAttribute("aria-label")).toBe("Disable globe");

    button.removeAttribute("aria-label");
    button.setAttribute("title", "Enable globe");
    await Promise.resolve();
    expect(button.getAttribute("aria-label")).toBe("Enable globe");

    stop();
  });

  it("retains the active map so geolocation and pin updates work", async () => {
    const easeTo = jest.fn();
    const fitBounds = jest.fn();
    const setData = jest.fn();
    const setPaintProperty = jest.fn();
    const remove = jest.fn();
    const removeMarker = jest.fn();
    const markerElements: HTMLButtonElement[] = [];
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
      fitBounds = fitBounds;
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

    class FakeMarker {
      constructor({ element }: { element: HTMLButtonElement }) {
        markerElements.push(element);
      }
      addTo() {
        return this;
      }
      remove = removeMarker;
      setLngLat() {
        return this;
      }
    }

    Object.defineProperty(window, "__growpathMapLibre", {
      configurable: true,
      value: {
        Map: FakeMap,
        Marker: FakeMarker,
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
    expect(easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-77.04, 38.9], zoom: 9.5 })
    );
    expect(markerElements).toHaveLength(1);
    expect(markerElements[0].textContent).toBe("1");
    expect(markerElements[0].getAttribute("aria-label")).toBe(
      "1 published observation at this approximate map place"
    );
    markerElements[0].click();
    expect(onSelectObservations).toHaveBeenCalledWith(["observation-2"]);
    const showPublishedButton = tree.root.find(
      (node: any) =>
        node.type === "button" && node.props.children === "Show published observations"
    );
    await act(async () => {
      showPublishedButton.props.onClick();
    });
    expect(easeTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: [-77.04, 38.9], zoom: 9.5 })
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
    expect(removeMarker).toHaveBeenCalledTimes(1);
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
