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

function expoProjectId() {
  const fromConfig =
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants.easConfig as any)?.projectId ||
    (Constants.expoConfig as any)?.projectId ||
    "";
  return String(fromConfig || "").trim();
}

export function usePushRegistration({ userId, token, isHydrating }: PushAuth) {
  const lastTokenSent = useRef<string | null>(null);

  useEffect(() => {
    if (isHydrating || !userId || !token || Platform.OS === "web") return;

    const key = `${userId}:${token}`;
    if (lastTokenSent.current === key) return;

    let cancelled = false;

    (async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted || cancelled || !Notifications) return;

        await setupAndroidChannel();

        const projectId = expoProjectId();
        if (!projectId) return;

        const result = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = String(result?.data || "").trim();
        if (!pushToken) return;

        await savePushToken(pushToken);
        if (!cancelled) lastTokenSent.current = key;
      } catch (error) {
        console.error("Push registration failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, token, isHydrating]);
}
