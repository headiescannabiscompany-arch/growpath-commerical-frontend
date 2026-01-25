import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, markNotificationRead } from "../api/notifications";
import { AppState } from "react-native";

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id) => {
      await markNotificationRead(id);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { items, loading, refresh, markRead };
}
