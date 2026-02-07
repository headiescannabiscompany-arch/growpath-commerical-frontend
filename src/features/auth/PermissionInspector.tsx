import React from "react";
import { View, Text } from "react-native";

type PermissionInspectorProps = {
  requiredRole?: string;
  requiredPlan?: string;
  userRole?: string | null;
  userPlan?: string | null;
};

export default function PermissionInspector({
  requiredRole,
  requiredPlan,
  userRole,
  userPlan
}: PermissionInspectorProps) {
  return (
    <View
      style={{ padding: 16, backgroundColor: "#fff3e0", borderRadius: 8, margin: 12 }}
    >
      <Text style={{ fontWeight: "bold", color: "#e65100" }}>Access Restricted</Text>
      {requiredRole && <Text>Required role: {requiredRole}</Text>}
      {requiredPlan && <Text>Required plan: {requiredPlan}</Text>}
      <Text>Your role: {userRole}</Text>
      <Text>Your plan: {userPlan}</Text>
    </View>
  );
}
