import React, { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

type MapLibreMap = any;
type MapLibreGeoJSONSource = any;
type MapLibreModule = {
  Map: new (options: any) => MapLibreMap;
  NavigationControl: new (options?: any) => any;
  GlobeControl: new () => any;
  FullscreenControl: new () => any;
  GeolocateControl: new (options?: any) => any;
};

const MAPLIBRE_SCRIPT_ID = "growpath-maplibre-loader";
const MAPLIBRE_READY_EVENT = "growpath-maplibre-ready";
let mapLibrePromise: Promise<MapLibreModule> | null = null;
const removedMapInstances = new WeakSet<object>();

export function safelyRemoveMapLibreMap(
  map: MapLibreMap | null,
  container: HTMLDivElement | null
) {
  if (!map || typeof map.remove !== "function") return;

  if (typeof map === "object") {
    if (removedMapInstances.has(map)) return;
    removedMapInstances.add(map);
  }

  try {
    map.remove();
  } catch (error) {
    // MapLibre teardown is not fully idempotent on every WebKit lifecycle path.
    // A page transition or lost WebGL context can clear its painter before
    // remove() reaches painter.destroy(). Cleanup must never crash navigation.
    if (__DEV__) {
      console.warn("[FieldObservationGlobe] map teardown was already incomplete:", error);
    }
    container?.replaceChildren();
  }
}

export function loadMapLibreModule() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("The interactive globe is only available in a web browser.")
    );
  }
  const existing = (window as any).__growpathMapLibre as MapLibreModule | undefined;
  if (existing?.Map) return Promise.resolve(existing);
  if (!mapLibrePromise) {
    mapLibrePromise = new Promise<MapLibreModule>((resolve, reject) => {
      const finish = () => {
        const loaded = (window as any).__growpathMapLibre as MapLibreModule | undefined;
        if (loaded?.Map) {
          window.removeEventListener(MAPLIBRE_READY_EVENT, onReady);
          resolve(loaded);
          return true;
        }
        return false;
      };
      const onReady = () => {
        if (!finish()) reject(new Error("The map module loaded without its Map API."));
      };
      window.addEventListener(MAPLIBRE_READY_EVENT, onReady, { once: true });
      const existingScript = document.getElementById(MAPLIBRE_SCRIPT_ID);
      if (existingScript) {
        if (!finish())
          existingScript.addEventListener(
            "error",
            () => reject(new Error("The map module could not be loaded.")),
            { once: true }
          );
        return;
      }
      const script = document.createElement("script");
      script.id = MAPLIBRE_SCRIPT_ID;
      script.async = true;
      script.type = "module";
      script.src = "/maplibre-loader.mjs";
      script.addEventListener(
        "error",
        () => reject(new Error("The map module could not be loaded.")),
        { once: true }
      );
      document.head.appendChild(script);
    }).catch((error) => {
      mapLibrePromise = null;
      throw error;
    });
  }
  return mapLibrePromise;
}

import type { FieldObservation } from "@/api/fieldStudies";
import { useAppTheme } from "@/theme/appTheme";

export type FieldObservationViewport = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type Props = {
  observations: FieldObservation[];
  selectedObservationId?: string;
  onSelectObservations: (observationIds: string[]) => void;
  onViewportChange: (viewport: FieldObservationViewport | null) => void;
  compact?: boolean;
};

const SOURCE_ID = "growpath-field-observations";
const CLUSTER_LAYER_ID = "growpath-observation-clusters";
const PIN_LAYER_ID = "growpath-observation-pins";
const UNITED_STATES_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_TILE_URL =
  process.env.EXPO_PUBLIC_FIELD_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  process.env.EXPO_PUBLIC_FIELD_MAP_ATTRIBUTION || "© OpenStreetMap contributors";

function observationId(observation: FieldObservation) {
  return String(observation.id || observation._id || "");
}

function observationsToGeoJson(observations: FieldObservation[]) {
  return {
    type: "FeatureCollection",
    features: observations.flatMap((observation) => {
      const latitude = Number(observation.location?.latitude);
      const longitude = Number(observation.location?.longitude);
      const id = observationId(observation);
      if (!id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      return [
        {
          type: "Feature",
          id,
          geometry: { type: "Point", coordinates: [longitude, latitude] },
          properties: {
            id,
            precision: observation.location?.precision || "approximate",
            verificationStatus: observation.identity?.verificationStatus || "ai_candidate"
          }
        }
      ];
    })
  } as any;
}

export function fallbackStyle() {
  return {
    version: 8,
    sources: {
      "growpath-base-map": {
        type: "raster",
        tiles: [DEFAULT_TILE_URL],
        tileSize: 256,
        attribution: DEFAULT_ATTRIBUTION,
        maxzoom: 19
      }
    },
    layers: [
      {
        id: "growpath-base-map",
        type: "raster",
        source: "growpath-base-map",
        minzoom: 0,
        maxzoom: 22
      }
    ]
  } as any;
}

function viewportFromMap(map: MapLibreMap): FieldObservationViewport | null {
  const bounds = map.getBounds();
  const west = Math.max(-180, bounds.getWest());
  const east = Math.min(180, bounds.getEast());
  const south = Math.max(-90, bounds.getSouth());
  const north = Math.min(90, bounds.getNorth());
  if (
    ![west, south, east, north].every(Number.isFinite) ||
    west >= east ||
    south >= north
  ) {
    return null;
  }
  return { west, south, east, north };
}

export default function FieldObservationGlobe({
  observations,
  selectedObservationId,
  compact = false,
  onSelectObservations,
  onViewportChange
}: Props) {
  const { palette } = useAppTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const observationsRef = useRef(observations);
  const onSelectRef = useRef(onSelectObservations);
  const onViewportRef = useRef(onViewportChange);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [locationMessage, setLocationMessage] = useState(
    "Showing the United States while location access is checked."
  );

  useEffect(() => {
    observationsRef.current = observations;
    const source = mapRef.current?.getSource(SOURCE_ID) as
      | MapLibreGeoJSONSource
      | undefined;
    source?.setData(observationsToGeoJson(observations));
  }, [observations]);

  useEffect(() => {
    onSelectRef.current = onSelectObservations;
  }, [onSelectObservations]);

  useEffect(() => {
    onViewportRef.current = onViewportChange;
  }, [onViewportChange]);

  const centerOnUser = useCallback((shouldPrompt = true) => {
    const map = mapRef.current;
    if (!map || typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable, so the globe is showing the United States."
      );
      return;
    }
    setLocationMessage(
      shouldPrompt ? "Requesting your location…" : "Centering near your location…"
    );
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.easeTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 4.25,
          duration: 1000
        });
        setLocationMessage(
          "Centered near your location. Your location is not published by viewing the globe."
        );
      },
      () => {
        setLocationMessage(
          "Location is not enabled, so the globe is showing the United States."
        );
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let map: MapLibreMap | null = null;
    let disposed = false;
    void loadMapLibreModule()
      .then((maplibregl) => {
        if (disposed || containerRef.current !== container || mapRef.current) return;
        const configuredStyle = process.env.EXPO_PUBLIC_FIELD_MAP_STYLE_URL;
        const activeMap = new maplibregl.Map({
          container,
          style: configuredStyle || fallbackStyle(),
          center: UNITED_STATES_CENTER,
          zoom: 2.55,
          minZoom: 1.25,
          maxZoom: 18,
          attributionControl: { compact: true }
        });
        map = activeMap;
        mapRef.current = activeMap;

        const emitViewport = () => {
          onViewportRef.current(viewportFromMap(activeMap));
        };
        const selectPin = (event: any) => {
          const id = String(event.features?.[0]?.properties?.id || "");
          if (id) onSelectRef.current([id]);
        };
        const expandCluster = async (event: any) => {
          const feature = event.features?.[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          const coordinates = (feature?.geometry as any)?.coordinates;
          const source = activeMap.getSource(SOURCE_ID) as
            | MapLibreGeoJSONSource
            | undefined;
          if (!source || !Number.isFinite(clusterId) || !Array.isArray(coordinates))
            return;
          const center: [number, number] = [
            Number(coordinates[0]),
            Number(coordinates[1])
          ];
          if (!center.every(Number.isFinite)) return;
          const leaves = await source.getClusterLeaves(clusterId, 100, 0);
          const observationIds = leaves
            .map((leaf: any) => String(leaf.properties?.id || ""))
            .filter(Boolean);
          if (observationIds.length) onSelectRef.current(observationIds);

          const zoom = await source.getClusterExpansionZoom(clusterId);
          activeMap.easeTo({ center, zoom, duration: 650 });
        };
        const showPointer = () => {
          activeMap.getCanvas().style.cursor = "pointer";
        };
        const clearPointer = () => {
          activeMap.getCanvas().style.cursor = "";
        };

        activeMap.on("load", () => {
          activeMap.setProjection({ type: "globe" });
          activeMap.addSource(SOURCE_ID, {
            type: "geojson",
            data: observationsToGeoJson(observationsRef.current),
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 48
          });
          activeMap.addLayer({
            id: CLUSTER_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#65A30D",
                10,
                "#15803D",
                50,
                "#14532D"
              ],
              "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 50, 29],
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 3
            }
          });
          activeMap.addLayer({
            id: PIN_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "case",
                ["==", ["get", "precision"], "exact"],
                "#15803D",
                "#D97706"
              ],
              "circle-radius": 9,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 3
            }
          });
          activeMap.on("click", CLUSTER_LAYER_ID, expandCluster);
          activeMap.on("click", PIN_LAYER_ID, selectPin);
          activeMap.on("mouseenter", CLUSTER_LAYER_ID, showPointer);
          activeMap.on("mouseleave", CLUSTER_LAYER_ID, clearPointer);
          activeMap.on("mouseenter", PIN_LAYER_ID, showPointer);
          activeMap.on("mouseleave", PIN_LAYER_ID, clearPointer);
          activeMap.on("moveend", emitViewport);
          setReady(true);
          emitViewport();

          const permissions = (navigator as any)?.permissions;
          if (permissions?.query) {
            void permissions
              .query({ name: "geolocation" })
              .then((result: PermissionStatus) => {
                if (result.state === "granted") {
                  centerOnUser(false);
                } else {
                  setLocationMessage(
                    "Location is not enabled, so the globe is showing the United States."
                  );
                }
              })
              .catch(() => {
                setLocationMessage(
                  "Location is not enabled, so the globe is showing the United States."
                );
              });
          } else {
            setLocationMessage(
              "Location is not enabled, so the globe is showing the United States."
            );
          }
        });
        activeMap.on("error", (event: any) => {
          if (!activeMap.loaded()) {
            setMapError(
              event?.error?.message ||
                "The interactive globe could not load. The observation list is still available."
            );
          }
        });
        const safeAddControl = (control: any, position: string) => {
          try {
            activeMap.addControl(control, position as any);
          } catch (controlError) {
            if (__DEV__) {
              console.warn("[FieldObservationGlobe] control unavailable:", controlError);
            }
          }
        };
        safeAddControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          "top-right"
        );
        safeAddControl(new maplibregl.GlobeControl(), "top-right");
        safeAddControl(new maplibregl.FullscreenControl(), "top-right");
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          safeAddControl(
            new maplibregl.GeolocateControl({
              positionOptions: { enableHighAccuracy: false },
              trackUserLocation: false
            }),
            "top-right"
          );
        }
      })
      .catch((error) => {
        if (!disposed) {
          setMapError(
            error instanceof Error
              ? error.message
              : "The interactive globe could not load. The observation list is still available."
          );
        }
      });

    return () => {
      disposed = true;
      if (mapRef.current === map) mapRef.current = null;
      safelyRemoveMapLibreMap(map, container);
      map = null;
    };
  }, [centerOnUser]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer(PIN_LAYER_ID)) return;
    map.setPaintProperty(PIN_LAYER_ID, "circle-radius", [
      "case",
      ["==", ["get", "id"], selectedObservationId || ""],
      13,
      9
    ]);
  }, [ready, selectedObservationId]);

  return (
    <div className="growpath-field-globe-shell">
      <div
        aria-label={`Interactive globe with ${observations.length} shared plant observations`}
        className={`growpath-field-globe ${compact ? "growpath-field-globe-compact" : ""}`.trim()}
        ref={containerRef}
        role="application"
      />
      {!ready && !mapError ? (
        <div aria-live="polite" className="growpath-field-globe-status">
          Loading the living world…
        </div>
      ) : null}
      {mapError ? (
        <div aria-live="polite" className="growpath-field-globe-error">
          {mapError}
        </div>
      ) : null}
      <div className="growpath-field-globe-location">
        <button disabled={!ready} onClick={() => centerOnUser(true)} type="button">
          Use my location
        </button>
        <span aria-live="polite">{locationMessage}</span>
      </div>
      <style>{`
        .growpath-field-globe-shell {
          position: relative;
          width: 100%;
        }
        .growpath-field-globe {
          background: ${palette.surfaceMuted};
          border-radius: 16px;
          height: min(64vh, 620px);
          min-height: 420px;
          overflow: hidden;
          width: 100%;
        }
        .growpath-field-globe-compact {
          height: min(34vh, 280px);
          min-height: 220px;
        }
        .growpath-field-globe-status,
        .growpath-field-globe-error {
          background: ${palette.surface};
          border: 1px solid ${palette.border};
          border-radius: 10px;
          color: ${palette.text};
          left: 50%;
          padding: 10px 14px;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
        }
        .growpath-field-globe-error {
          color: ${palette.danger};
        }
        .growpath-field-globe-location {
          align-items: center;
          background: ${palette.surface};
          border: 1px solid ${palette.border};
          border-radius: 10px;
          bottom: 10px;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.18);
          display: flex;
          gap: 9px;
          left: 10px;
          max-width: calc(100% - 20px);
          padding: 7px 9px;
          position: absolute;
          z-index: 4;
        }
        .growpath-field-globe-location button {
          background: ${palette.accent};
          border: 0;
          border-radius: 8px;
          color: ${palette.accentText};
          cursor: pointer;
          font: inherit;
          font-weight: 800;
          min-height: 36px;
          padding: 7px 11px;
          white-space: nowrap;
        }
        .growpath-field-globe-location button:disabled {
          cursor: default;
          opacity: 0.55;
        }
        .growpath-field-globe-location span {
          color: ${palette.textMuted};
          font-size: 12px;
          line-height: 16px;
        }
        .growpath-field-globe .maplibregl-ctrl-group,
        .growpath-field-globe .maplibregl-ctrl-attrib {
          background: ${palette.surface};
          color: ${palette.textMuted};
        }
        .growpath-field-globe .maplibregl-ctrl-group button {
          background-color: ${palette.surface};
          border-color: ${palette.border};
        }
        .growpath-field-globe .maplibregl-ctrl-group button:hover {
          background-color: ${palette.surfaceMuted};
        }
        .growpath-field-globe .maplibregl-ctrl button .maplibregl-ctrl-icon {
          filter: ${palette.resolvedMode === "night" ? "invert(1)" : "none"};
        }
        .growpath-field-globe .maplibregl-ctrl-attrib a {
          color: ${palette.link};
        }
        @media (max-width: 640px) {
          .growpath-field-globe {
            height: 58vh;
            min-height: 360px;
          }
          .growpath-field-globe-compact {
            height: 240px;
            min-height: 220px;
          }
          .growpath-field-globe-location {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
