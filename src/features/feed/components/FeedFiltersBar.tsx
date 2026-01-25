// src/features/feed/components/FeedFiltersBar.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";

interface FeedFiltersBarProps {
  types?: string[];
  selectedType?: string;
  onSelectType?: (type: string) => void;
  status?: string;
  onSelectStatus?: (status: string) => void;
  myPosts?: boolean;
  onToggleMyPosts?: (val: boolean) => void;
}

const FEED_TYPES = ["all", "task", "alert", "log", "event", "compliance", "note"];
const FEED_STATUS = ["open", "done", "ack", "closed", "info"];

export function FeedFiltersBar({
  types = FEED_TYPES,
  selectedType = "all",
  onSelectType = () => {},
  status = "",
  onSelectStatus = () => {},
  myPosts = false,
  onToggleMyPosts = () => {}
}: FeedFiltersBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.chipsRow}>
        {types.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, selectedType === type && styles.chipSelected]}
            onPress={() => onSelectType(type)}
          >
            <Text
              style={selectedType === type ? styles.chipTextSelected : styles.chipText}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.chipsRow}>
        {FEED_STATUS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, status === s && styles.chipSelected]}
            onPress={() => onSelectStatus(s)}
          >
            <Text style={status === s ? styles.chipTextSelected : styles.chipText}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.myPostsRow}>
        <Text style={styles.myPostsLabel}>My Posts</Text>
        <Switch value={myPosts} onValueChange={onToggleMyPosts} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: "#f8f8f8"
  },
  chipsRow: {
    flexDirection: "row",
    marginBottom: 4
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#eee",
    marginRight: 8
  },
  chipSelected: {
    backgroundColor: "#007AFF"
  },
  chipText: {
    color: "#333"
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "bold"
  },
  myPostsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  myPostsLabel: {
    fontSize: 16,
    marginRight: 8
  }
});
