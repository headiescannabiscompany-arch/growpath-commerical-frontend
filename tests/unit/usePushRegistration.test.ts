import { Platform } from "react-native";

import { registerPushTokenForCurrentSession } from "@/hooks/usePushRegistration";

const mockSavePushToken = jest.fn();
const mockRequestNotificationPermission = jest.fn();
const mockSetupAndroidChannel = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();

const originalPlatformOs = Platform.OS;

jest.mock("@/api/auth", () => ({
  savePushToken: (...args: any[]) => mockSavePushToken(...args)
}));

jest.mock("@/utils/notifications", () => ({
  requestNotificationPermission: (...args: any[]) =>
    mockRequestNotificationPermission(...args),
  setupAndroidChannel: (...args: any[]) => mockSetupAndroidChannel(...args)
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "project-123" } } },
  easConfig: { projectId: "project-123" }
}));

jest.mock("expo-device", () => ({
  isDevice: true
}));

jest.mock("expo-notifications", () => ({
  getExpoPushTokenAsync: (...args: any[]) => mockGetExpoPushTokenAsync(...args)
}));

describe("registerPushTokenForCurrentSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs
    });
  });

  it("saves an Expo push token after native permission is granted", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios"
    });
    mockRequestNotificationPermission.mockResolvedValue(true);
    mockGetExpoPushTokenAsync.mockResolvedValue({
      data: "ExponentPushToken[abc-123]"
    });

    await expect(
      registerPushTokenForCurrentSession(
        { userId: "user-1", token: "session-token-1", isHydrating: false },
        {
          requestNotificationPermission: mockRequestNotificationPermission,
          setupAndroidChannel: mockSetupAndroidChannel,
          savePushToken: mockSavePushToken,
          getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
          projectId: "project-123"
        }
      )
    ).resolves.toEqual({
      registered: true,
      pushToken: "ExponentPushToken[abc-123]"
    });

    expect(mockRequestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(mockSetupAndroidChannel).toHaveBeenCalledTimes(1);
    expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-123"
    });
    expect(mockSavePushToken).toHaveBeenCalledWith("ExponentPushToken[abc-123]");
  });

  it("skips push registration on web", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web"
    });

    await expect(
      registerPushTokenForCurrentSession(
        { userId: "user-1", token: "session-token-1", isHydrating: false },
        {
          requestNotificationPermission: mockRequestNotificationPermission,
          setupAndroidChannel: mockSetupAndroidChannel,
          savePushToken: mockSavePushToken,
          getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
          projectId: "project-123"
        }
      )
    ).resolves.toEqual({ registered: false });

    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
    expect(mockSetupAndroidChannel).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });
});
