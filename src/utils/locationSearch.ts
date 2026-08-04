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

export function requestCurrentCoordinates(): Promise<PublicCoordinates> {
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
        const coordinates = parsePublicCoordinates(
          position?.coords?.latitude,
          position?.coords?.longitude
        );
        if (!coordinates) {
          reject(new Error("The device returned an invalid location."));
          return;
        }
        const accuracyMeters = Number(position?.coords?.accuracy);
        resolve({
          ...coordinates,
          ...(Number.isFinite(accuracyMeters) && accuracyMeters >= 0
            ? { accuracyMeters }
            : {})
        });
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
