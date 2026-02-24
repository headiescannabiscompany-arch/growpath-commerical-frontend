// src/features/feed/components/FeedItemCard.tsx

import React, { useCallback } from "react";
import { FeatureGate } from "../../../components/FeatureGate";
import { CAPABILITY_KEYS } from "@/entitlements";
import { Pressable, Button, View, Text, StyleSheet, Alert } from "react-native";
import { useCommercialFeed } from "../hooks/useCommercialFeed";
import type { FeedItem } from "../types/feed";
// If expo-router is not available, fallback to a no-op router
let useRouter: any = () => ({ push: () => {} });
try {
  // @ts-ignore
  useRouter = require("expo-router").useRouter;
} catch {}

function getRouteForItem(item: FeedItem): string {
  if (item.type === "task") return `/app/(commercial)/tasks/${item.id}`;
  if (item.type === "alert") return `/app/(commercial)/alerts/${item.id}`;
  if (item.type === "log") {
    if (item.entityLinks?.growId) return `/app/grows/${item.entityLinks.growId}`;
    if (item.entityLinks?.plantId) return `/app/plants/${item.entityLinks.plantId}`;
    return `/app/(commercial)/logs/${item.id}`;
  }
  return "";
}

const statusColors: Record<string, string> = {
  open: "#2196f3",
  done: "#4caf50",
  ack: "#ff9800",
  closed: "#9e9e9e",
  info: "#607d8b"
};

export const FeedItemCard = React.memo(function FeedItemCard({
  item
}: {
  item: FeedItem;
}) {
  const router = useRouter();
  // Use the same hook as the screen, but only for optimistic helpers
  const { optimisticTaskStatus, optimisticAlertStatus } = useCommercialFeed({});

  const onPress = () => {
    const route = getRouteForItem(item);
    if (route) router.push(route);
  };

  // Optimistic actions
  const handleTaskAction = useCallback(async () => {
    try {
      await optimisticTaskStatus(item.id, item.status === "open" ? "done" : "open");
    } catch {
      Alert.alert("Error", "Failed to update task.");
    }
  }, [item, optimisticTaskStatus]);

  const handleAlertAck = useCallback(async () => {
    try {
      await optimisticAlertStatus(item.id, "ack");
    } catch {
      Alert.alert("Error", "Failed to acknowledge alert.");
    }
  }, [item, optimisticAlertStatus]);

  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: "#eee" }}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.type.toUpperCase()}</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusColors[item.status] || "#ccc" }
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.secondary}>
        {item.actor.name} â€¢ {item.scope.facilityId}
      </Text>
      <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
      {/* Optimistic actions for tasks and alerts, gated by entitlements */}
      {item.type === "task" && (
        <FeatureGate capability={CAPABILITY_KEYS.TASKS_WRITE}>
          <Button
            title={item.status === "open" ? "Complete" : "Reopen"}
            onPress={handleTaskAction}
          />
        </FeatureGate>
      )}
      {item.type === "alert" && item.status === "open" && (
        <FeatureGate capability={CAPABILITY_KEYS.ALERTS_ACK}>
          <Button title="Acknowledge" onPress={handleAlertAck} />
        </FeatureGate>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  title: {
    fontWeight: "bold",
    fontSize: 16
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
    fontWeight: "bold"
  },
  secondary: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4
  },
  timestamp: {
    color: "#aaa",
    fontSize: 12
  }
});
