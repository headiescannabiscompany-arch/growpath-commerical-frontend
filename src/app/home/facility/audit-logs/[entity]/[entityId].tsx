import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function AuditLogEntityScreen() {
  const { entity, entityId } = useLocalSearchParams<{
    entity?: string;
    entityId?: string;
  }>();

  return (
    <View style={{ padding: 16 }}>
      <Text>Audit Logs</Text>
      <Text>
        {String(entity)} / {String(entityId)}
      </Text>
    </View>
  );
}
