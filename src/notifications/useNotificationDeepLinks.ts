// src/notifications/useNotificationDeepLinks.ts
import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

// We expect push payload to include: data: { postId: "..." }
function extractPostId(data: any): string | null {
  if (!data) return null;
  const postId = data.postId || data?.data?.postId; // defensive
  return typeof postId === "string" && postId.length ? postId : null;
}

export function useNotificationDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    // 1) If app was opened from a notification (cold start)
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        const postId = extractPostId(resp?.notification?.request?.content?.data);
        if (postId) router.push(`/(app)/post/${postId}`);
      })
      .catch(() => {});

    // 2) If user taps notification while app is running/backgrounded
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const postId = extractPostId(resp?.notification?.request?.content?.data);
      if (postId) router.push(`/(app)/post/${postId}`);
    });

    return () => sub.remove();
  }, [router]);
}
