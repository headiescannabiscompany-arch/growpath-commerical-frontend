import React from "react";
import { View, Text } from "react-native";

/**
 * Personal Logs tab screen.
 * Exists to satisfy Expo Router imports and prevent bundler crashes.
 */
export default function LogsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Logs</Text>
      <Text>
        This tab is wired, but the Logs surface isn’t finalized yet. It will be connected
        to Grow Log Entries (facility) and/or Personal Logs depending on the final
        navigation plan.
      </Text>
    </View>
  );
}
import React from "react";
import { View, Text } from "react-native";

/**
 * Personal Logs tab screen.
 * Exists to satisfy Expo Router imports and prevent bundler crashes.
 */
export default function LogsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Logs</Text>
      <Text>This tab is wired but the Logs surface hasn’t been finalized yet.</Text>
    </View>
  );
}
import React from "react";
import { View, Text } from "react-native";

export default function LogsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Logs</Text>
      <Text style={{ opacity: 0.8 }}>
        Stub screen to keep routing stable. Will be wired later.
      </Text>
    </View>
  );
}
