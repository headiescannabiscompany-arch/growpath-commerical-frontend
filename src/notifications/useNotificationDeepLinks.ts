// src/notifications/useNotificationDeepLinks.ts
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { sourceObjectHref } from "@/utils/sourceLinks";

function payloadData(data: any): Record<string, any> {
  if (!data || typeof data !== "object") return {};
  if (data.data && typeof data.data === "object") {
    return { ...data, ...data.data };
  }
  return data;
}

function safeAppHref(value: unknown) {
  const href = String(value || "").trim();
  return href.startsWith("/") && !href.startsWith("//") ? href : "";
}

export function notificationHrefFromData(data: any): string | null {
  const payload = payloadData(data);
  const explicitHref = safeAppHref(payload.actionUrl || payload.href || payload.path);
  if (explicitHref) return explicitHref;

  const sourceHref = safeAppHref(sourceObjectHref(payload));
  if (sourceHref) return sourceHref;

  const postId = String(payload.postId || "").trim();
  if (postId) return `/forum/post?id=${encodeURIComponent(postId)}`;

  const notificationId = String(payload.notificationId || payload.id || "").trim();
  return notificationId
    ? `/home/notifications?notificationId=${encodeURIComponent(notificationId)}`
    : null;
}

export function useNotificationDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    // 1) If app was opened from a notification (cold start)
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        const href = notificationHrefFromData(resp?.notification?.request?.content?.data);
        if (href) router.push(href as any);
      })
      .catch(() => {});

    // 2) If user taps notification while app is running/backgrounded
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const href = notificationHrefFromData(resp?.notification?.request?.content?.data);
      if (href) router.push(href as any);
    });

    return () => sub.remove();
  }, [router]);
}
