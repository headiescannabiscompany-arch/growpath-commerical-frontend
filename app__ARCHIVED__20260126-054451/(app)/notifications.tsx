import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import RequireAuth from "../../src/auth/RequireAuth";
import {
  listNotifications,
  markAllRead,
  NotificationItem
} from "../../src/api/notifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await listNotifications();
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const res = await listNotifications();
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // ✅ Auto-mark ALL as read on open
  useFocusEffect(
    useCallback(() => {
      // fire-and-forget; then refresh list
      (async () => {
        try {
          await markAllRead();
          await load();
        } catch {
          // ignore: user can still see list
        }
      })();
    }, [load])
  );

  const onPressNotification = (n: NotificationItem) => {
    const postId = n?.data?.postId;
    if (postId) router.push(`/(app)/post/${postId}`);
  };

  return (
    <RequireAuth>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, marginBottom: 12 }}>Notifications</Text>

        {error ? (
          <View
            style={{ padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 12 }}
          >
            <Text style={{ marginBottom: 8 }}>{error}</Text>
            <Pressable
              onPress={load}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderRadius: 10,
                alignSelf: "flex-start"
              }}
            >
              <Text>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => {
            const unread = !item.read;
            return (
              <Pressable
                onPress={() => onPressNotification(item)}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  marginBottom: 10,
                  opacity: unread ? 1 : 0.75
                }}
              >
                <Text style={{ fontSize: 16, marginBottom: 4 }}>
                  {item.title || "Update"}
                  {unread ? " •" : ""}
                </Text>
                {item.body ? <Text style={{ opacity: 0.8 }}>{item.body}</Text> : null}
                <Text style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ opacity: 0.7 }}>No notifications yet.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </RequireAuth>
  );
}
