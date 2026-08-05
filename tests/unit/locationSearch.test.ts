const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: (...args: any[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  getForegroundPermissionsAsync: (...args: any[]) =>
    mockGetForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPositionAsync(...args)
}));

const { Platform } = require("react-native");
const {
  parsePublicCoordinates,
  requestCurrentCoordinates
} = require("@/utils/locationSearch");

describe("locationSearch", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined
    });
  });

  afterAll(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      delete (globalThis as any).navigator;
    }
  });

  it("accepts only finite in-range coordinates", () => {
    expect(parsePublicCoordinates("39.1", "-76.2")).toEqual({
      latitude: 39.1,
      longitude: -76.2
    });
    expect(parsePublicCoordinates(91, 0)).toBeNull();
    expect(parsePublicCoordinates(0, -181)).toBeNull();
    expect(parsePublicCoordinates("not-a-coordinate", 0)).toBeNull();
  });

  it("uses browser geolocation on web and preserves reported accuracy", async () => {
    const getCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: 39.2, longitude: -76.6, accuracy: 18 } })
    );
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { geolocation: { getCurrentPosition } }
    });

    await expect(requestCurrentCoordinates()).resolves.toEqual({
      latitude: 39.2,
      longitude: -76.6,
      accuracyMeters: 18
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ timeout: 10_000 })
    );
    expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("reads browser coordinates silently only when the Permissions API reports granted", async () => {
    const getCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: 39.2, longitude: -76.6, accuracy: 18 } })
    );
    const query = jest.fn().mockResolvedValue({ state: "granted" });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { geolocation: { getCurrentPosition }, permissions: { query } }
    });

    await expect(
      requestCurrentCoordinates({ promptForPermission: false })
    ).resolves.toEqual({
      latitude: 39.2,
      longitude: -76.6,
      accuracyMeters: 18
    });
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("does not invoke browser geolocation when silent permission is prompt or unknown", async () => {
    const getCurrentPosition = jest.fn();
    const query = jest.fn().mockResolvedValue({ state: "prompt" });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { geolocation: { getCurrentPosition }, permissions: { query } }
    });

    await expect(
      requestCurrentCoordinates({ promptForPermission: false })
    ).resolves.toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { geolocation: { getCurrentPosition } }
    });
    await expect(
      requestCurrentCoordinates({ promptForPermission: false })
    ).resolves.toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("reports web permission and invalid-coordinate failures", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition: (_success: any, failure: any) =>
            failure({ message: "Location blocked by browser" })
        }
      }
    });
    await expect(requestCurrentCoordinates()).rejects.toThrow(
      "Location blocked by browser"
    );

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition: (success: any) =>
            success({ coords: { latitude: 190, longitude: 20 } })
        }
      }
    });
    await expect(requestCurrentCoordinates()).rejects.toThrow(
      "The device returned an invalid location."
    );
  });

  it("requests foreground permission and coordinates on native devices", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 38.9, longitude: -77.04, accuracy: 9 }
    });

    await expect(requestCurrentCoordinates()).resolves.toEqual({
      latitude: 38.9,
      longitude: -77.04,
      accuracyMeters: 9
    });
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it("reads native coordinates without prompting only after foreground permission was granted", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 38.9, longitude: -77.04, accuracy: 9 }
    });

    await expect(
      requestCurrentCoordinates({ promptForPermission: false })
    ).resolves.toEqual({
      latitude: 38.9,
      longitude: -77.04,
      accuracyMeters: 9
    });
    expect(mockGetForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it("does not request native coordinates or permission when silent permission is denied", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    await expect(
      requestCurrentCoordinates({ promptForPermission: false })
    ).resolves.toBeNull();
    expect(mockRequestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("does not request native coordinates after permission denial", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    await expect(requestCurrentCoordinates()).rejects.toThrow(
      "Location permission was not granted"
    );
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });
});
