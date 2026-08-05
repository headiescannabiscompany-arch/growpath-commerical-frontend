import * as Location from "expo-location";
import { Platform } from "react-native";

export type PublicCoordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

function finiteCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function parsePublicCoordinates(
  latitude: unknown,
  longitude: unknown
): PublicCoordinates | null {
  const parsedLatitude = finiteCoordinate(latitude, -90, 90);
  const parsedLongitude = finiteCoordinate(longitude, -180, 180);
  if (parsedLatitude === null || parsedLongitude === null) return null;
  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

function coordinatesFromPosition(position: any): PublicCoordinates {
  const coordinates = parsePublicCoordinates(
    position?.coords?.latitude,
    position?.coords?.longitude
  );
  if (!coordinates) throw new Error("The device returned an invalid location.");
  const accuracyMeters = Number(position?.coords?.accuracy);
  return {
    ...coordinates,
    ...(Number.isFinite(accuracyMeters) && accuracyMeters >= 0 ? { accuracyMeters } : {})
  };
}

async function requestNativeCoordinates(): Promise<PublicCoordinates> {
  let permission;
  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch (error: any) {
    throw new Error(
      error?.message ||
        "Location permission could not be requested. Enter a location manually instead."
    );
  }
  if (permission?.status !== "granted") {
    throw new Error(
      "Location permission was not granted. Enter a location manually instead."
    );
  }
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return coordinatesFromPosition(position);
  } catch (error: any) {
    if (error?.message === "The device returned an invalid location.") throw error;
    throw new Error(
      error?.message ||
        "Current location is unavailable on this device. Enter a location manually instead."
    );
  }
}

async function readNativeCoordinatesIfPermitted(): Promise<PublicCoordinates | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission?.status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return coordinatesFromPosition(position);
  } catch {
    return null;
  }
}

function requestBrowserCoordinates(): Promise<PublicCoordinates> {
  return new Promise((resolve, reject) => {
    const geolocation = (globalThis as any)?.navigator?.geolocation;
    if (!geolocation?.getCurrentPosition) {
      reject(
        new Error(
          "Current location is unavailable on this device. Enter a region or location manually instead."
        )
      );
      return;
    }

    geolocation.getCurrentPosition(
      (position: any) => {
        try {
          resolve(coordinatesFromPosition(position));
        } catch (error) {
          reject(error);
        }
      },
      (error: any) => {
        reject(
          new Error(
            error?.message ||
              "Location permission was not granted. Enter a location manually instead."
          )
        );
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10 * 1000
      }
    );
  });
}

async function readBrowserCoordinatesIfPermitted(): Promise<PublicCoordinates | null> {
  const navigatorValue = (globalThis as any)?.navigator;
  const geolocation = navigatorValue?.geolocation;
  const permissions = navigatorValue?.permissions;
  if (!geolocation?.getCurrentPosition || !permissions?.query) return null;

  try {
    const permission = await permissions.query({ name: "geolocation" });
    if (permission?.state !== "granted") return null;
    return await requestBrowserCoordinates();
  } catch {
    return null;
  }
}

export type CurrentCoordinateOptions = {
  /** False reads coordinates only when permission is already granted and never prompts. */
  promptForPermission?: boolean;
};

export function requestCurrentCoordinates(): Promise<PublicCoordinates>;
export function requestCurrentCoordinates(options: {
  promptForPermission: false;
}): Promise<PublicCoordinates | null>;
export function requestCurrentCoordinates(
  options: CurrentCoordinateOptions = {}
): Promise<PublicCoordinates | null> {
  if (options.promptForPermission === false) {
    return Platform.OS === "web"
      ? readBrowserCoordinatesIfPermitted()
      : readNativeCoordinatesIfPermitted();
  }
  return Platform.OS === "web" ? requestBrowserCoordinates() : requestNativeCoordinates();
}
