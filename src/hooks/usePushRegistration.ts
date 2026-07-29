import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { savePushToken } from "../api/auth";
import {
  requestNotificationPermission,
  setupAndroidChannel
} from "../utils/notifications";

type NotificationsModule = typeof import("expo-notifications");

let Notifications: NotificationsModule | null = null;
if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");
}

type PushAuth = {
  userId?: string | null;
  token?: string | null;
  isHydrating: boolean;
};

type PushRegistrationDeps = {
  requestNotificationPermission?: typeof requestNotificationPermission;
  setupAndroidChannel?: typeof setupAndroidChannel;
  savePushToken?: typeof savePushToken;
  getExpoPushTokenAsync?: (args: { projectId: string }) => Promise<{ data?: string }>;
  projectId?: string;
};

function expoProjectId() {
  const fromConfig =
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants.easConfig as any)?.projectId ||
    (Constants.expoConfig as any)?.projectId ||
    "";
  return String(fromConfig || "").trim();
}

export async function registerPushTokenForCurrentSession(
  { userId, token, isHydrating }: PushAuth,
  deps: PushRegistrationDeps = {}
) {
  if (isHydrating || !userId || !token || Platform.OS === "web") {
    return { registered: false as const };
  }

  try {
    const requestPermission =
      deps.requestNotificationPermission || requestNotificationPermission;
    const setupChannel = deps.setupAndroidChannel || setupAndroidChannel;
    const saveToken = deps.savePushToken || savePushToken;
    const getExpoPushTokenAsync =
      deps.getExpoPushTokenAsync ||
      Notifications?.getExpoPushTokenAsync?.bind(Notifications) ||
      null;

    const granted = await requestPermission();
    if (!granted || !getExpoPushTokenAsync) return { registered: false as const };

    await setupChannel();

    const projectId = deps.projectId || expoProjectId();
    if (!projectId) return { registered: false as const };

    const result = await getExpoPushTokenAsync({ projectId });
    const pushToken = String(result?.data || "").trim();
    if (!pushToken) return { registered: false as const };

    await saveToken(pushToken);
    return { registered: true as const, pushToken };
  } catch (error) {
    console.error("Push registration failed:", error);
    return { registered: false as const };
  }
}

export function usePushRegistration({ userId, token, isHydrating }: PushAuth) {
  const lastTokenSent = useRef<string | null>(null);

  useEffect(() => {
    if (isHydrating || !userId || !token || Platform.OS === "web") return;

    const key = `${userId}:${token}`;
    if (lastTokenSent.current === key) return;

    let cancelled = false;

    (async () => {
      const result = await registerPushTokenForCurrentSession(
        { userId, token, isHydrating },
        {
          requestNotificationPermission,
          setupAndroidChannel,
          savePushToken,
          getExpoPushTokenAsync: Notifications?.getExpoPushTokenAsync?.bind(Notifications) || undefined,
          projectId: expoProjectId()
        }
      );
      if (result.registered && !cancelled) {
        if (!cancelled) lastTokenSent.current = key;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, token, isHydrating]);
}
