import React, { useEffect, useRef, useState } from "react";

import { parsePublicCoordinates, type PublicCoordinates } from "@/utils/locationSearch";
import {
  fallbackStyle,
  loadMapLibreModule,
  safelyRemoveMapLibreMap
} from "./FieldObservationGlobe.web";

type Props = {
  value: PublicCoordinates | null;
  onChange: (coordinates: PublicCoordinates) => void;
};

const UNITED_STATES_CENTER: [number, number] = [-98.5795, 39.8283];
const SOURCE_ID = "growpath-private-location";
const LAYER_ID = "growpath-private-location-pin";

function pointData(value: PublicCoordinates | null) {
  return {
    type: "FeatureCollection",
    features: value
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [value.longitude, value.latitude] },
            properties: {}
          }
        ]
      : []
  };
}

export default function PrivateLocationPicker({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const [error, setError] = useState("");
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : "");
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : "");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    mapRef.current?.getSource(SOURCE_ID)?.setData(pointData(value));
    if (value) {
      setLatitude(String(value.latitude));
      setLongitude(String(value.longitude));
    }
  }, [value]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let disposed = false;
    let map: any = null;
    void loadMapLibreModule()
      .then((maplibregl) => {
        if (disposed || containerRef.current !== container) return;
        map = new maplibregl.Map({
          container,
          style: process.env.EXPO_PUBLIC_FIELD_MAP_STYLE_URL || fallbackStyle(),
          center: initialValueRef.current
            ? [initialValueRef.current.longitude, initialValueRef.current.latitude]
            : UNITED_STATES_CENTER,
          zoom: initialValueRef.current ? 12 : 2.55,
          minZoom: 1.25,
          maxZoom: 18,
          attributionControl: { compact: true }
        });
        mapRef.current = map;
        map.on("load", () => {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: pointData(initialValueRef.current)
          });
          map.addLayer({
            id: LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-radius": 9,
              "circle-color": "#176b3a",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 3
            }
          });
        });
        map.on("click", (event: any) => {
          const latitude = Number(event?.lngLat?.lat);
          const longitude = Number(event?.lngLat?.lng);
          if (Number.isFinite(latitude) && Number.isFinite(longitude))
            onChangeRef.current({ latitude, longitude });
        });
      })
      .catch(() => setError("The map could not be loaded. Try device location instead."));
    return () => {
      disposed = true;
      safelyRemoveMapLibreMap(map, container);
      if (mapRef.current === map) mapRef.current = null;
    };
  }, []);

  return (
    <div>
      <p style={{ margin: "0 0 8px", color: "inherit" }}>
        Tap the map to place the plant pin. The exact point stays private unless you later
        choose and confirm Nature sharing.
      </p>
      <div
        ref={containerRef}
        role="application"
        aria-label="Map for placing the private plant location"
        style={{ width: "100%", height: 280, borderRadius: 12, overflow: "hidden" }}
      />
      <fieldset
        style={{
          border: "1px solid currentColor",
          borderRadius: 10,
          display: "grid",
          gap: 8,
          margin: "12px 0 0",
          padding: 12
        }}
      >
        <legend>Or enter known coordinates</legend>
        <p style={{ margin: 0 }}>
          Use this for a known park or observation point when the original photo no longer
          contains location data. Coordinates are staged here and are not saved until you
          choose Save Private Pin.
        </p>
        <label>
          Latitude
          <input
            aria-label="Plant latitude"
            inputMode="decimal"
            onChange={(event) => setLatitude(event.currentTarget.value)}
            placeholder="39.104070"
            style={{ boxSizing: "border-box", marginTop: 4, padding: 8, width: "100%" }}
            value={latitude}
          />
        </label>
        <label>
          Longitude
          <input
            aria-label="Plant longitude"
            inputMode="decimal"
            onChange={(event) => setLongitude(event.currentTarget.value)}
            placeholder="-76.973493"
            style={{ boxSizing: "border-box", marginTop: 4, padding: 8, width: "100%" }}
            value={longitude}
          />
        </label>
        <button
          onClick={() => {
            const coordinates = parsePublicCoordinates(latitude, longitude);
            if (!coordinates) {
              setError("Enter a valid latitude and longitude.");
              return;
            }
            setError("");
            onChange(coordinates);
            mapRef.current?.flyTo?.({
              center: [coordinates.longitude, coordinates.latitude],
              zoom: 12
            });
          }}
          type="button"
        >
          Stage These Coordinates Privately
        </button>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
