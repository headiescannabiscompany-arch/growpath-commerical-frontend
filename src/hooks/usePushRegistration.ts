import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { savePushToken } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export function usePushRegistration() {
  const { user, token } = useAuth();
  const lastTokenSent = useRef<string | null>(null);

  useEffect(() => {
    async function registerForPush() {
      if (!user || !token) return;
      // Only run on physical device
      if (!Device.isDevice) return;
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;
      // Get Expo push token
      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
      if (!expoPushToken) return;
      // Avoid spamming backend
      if (lastTokenSent.current === expoPushToken) return;
      await savePushToken(expoPushToken);
      lastTokenSent.current = expoPushToken;
    }
    registerForPush();
  }, [user, token]);
}
