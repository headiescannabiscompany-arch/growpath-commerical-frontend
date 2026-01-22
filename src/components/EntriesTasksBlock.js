import React from "react";
import { Text } from "react-native";

export default function EntriesTasksBlock({ selectedKey, entriesAndTasks, styles }) {
  if (!selectedKey) return null;
  if (entriesAndTasks.length > 0) {
    return entriesAndTasks.map((item, idx) => (
      <Text key={idx}>{item.title || item.name}</Text>
    ));
  }
  return (
    <Text style={styles.emptySelectedState}>
      No entries or tasks for this day yet. Add one below to start planning.
    </Text>
  );
}
