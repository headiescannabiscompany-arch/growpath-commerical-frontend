import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { FieldObservation } from "@/api/fieldStudies";

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

function fallbackStyle() {
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

function viewportFromMap(map: maplibregl.Map): FieldObservationViewport | null {
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
  onSelectObservations,
  onViewportChange
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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
      | maplibregl.GeoJSONSource
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
    if (!containerRef.current || mapRef.current) return;

    const configuredStyle = process.env.EXPO_PUBLIC_FIELD_MAP_STYLE_URL;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: configuredStyle || fallbackStyle(),
      center: UNITED_STATES_CENTER,
      zoom: 2.55,
      minZoom: 1.25,
      maxZoom: 18,
      attributionControl: { compact: true }
    });
    mapRef.current = map;

    const emitViewport = () => {
      onViewportRef.current(viewportFromMap(map));
    };
    const selectPin = (event: maplibregl.MapLayerMouseEvent) => {
      const id = String(event.features?.[0]?.properties?.id || "");
      if (id) onSelectRef.current([id]);
    };
    const expandCluster = async (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const coordinates = (feature?.geometry as any)?.coordinates;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source || !Number.isFinite(clusterId) || !Array.isArray(coordinates)) return;
      const center: [number, number] = [Number(coordinates[0]), Number(coordinates[1])];
      if (!center.every(Number.isFinite)) return;
      const leaves = await source.getClusterLeaves(clusterId, 100, 0);
      const observationIds = leaves
        .map((leaf) => String(leaf.properties?.id || ""))
        .filter(Boolean);
      if (observationIds.length) onSelectRef.current(observationIds);

      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center, zoom, duration: 650 });
    };
    const showPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: observationsToGeoJson(observationsRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 48
      });
      map.addLayer({
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
      map.addLayer({
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
      map.on("click", CLUSTER_LAYER_ID, expandCluster);
      map.on("click", PIN_LAYER_ID, selectPin);
      map.on("mouseenter", CLUSTER_LAYER_ID, showPointer);
      map.on("mouseleave", CLUSTER_LAYER_ID, clearPointer);
      map.on("mouseenter", PIN_LAYER_ID, showPointer);
      map.on("mouseleave", PIN_LAYER_ID, clearPointer);
      map.on("moveend", emitViewport);
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
    map.on("error", (event) => {
      if (!map.loaded()) {
        setMapError(
          event?.error?.message ||
            "The interactive globe could not load. The observation list is still available."
        );
      }
    });
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );
    map.addControl(new maplibregl.GlobeControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false
      }),
      "top-right"
    );

    return () => {
      map.remove();
      mapRef.current = null;
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
  }, [selectedObservationId]);

  return (
    <div className="growpath-field-globe-shell">
      <div
        aria-label={`Interactive globe with ${observations.length} shared plant observations`}
        className="growpath-field-globe"
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
          background: #dbeafe;
          border-radius: 16px;
          height: min(64vh, 620px);
          min-height: 420px;
          overflow: hidden;
          width: 100%;
        }
        .growpath-field-globe-status,
        .growpath-field-globe-error {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 10px;
          color: #334155;
          left: 50%;
          padding: 10px 14px;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
        }
        .growpath-field-globe-error {
          color: #991b1b;
        }
        .growpath-field-globe-location {
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
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
          background: #166534;
          border: 0;
          border-radius: 8px;
          color: #fff;
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
          color: #334155;
          font-size: 12px;
          line-height: 16px;
        }
        @media (max-width: 640px) {
          .growpath-field-globe {
            height: 58vh;
            min-height: 360px;
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
