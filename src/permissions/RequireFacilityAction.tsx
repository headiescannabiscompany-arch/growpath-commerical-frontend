import React from "react";
import { View, Text } from "react-native";
import type { FacilityAction } from "./actions";
import { useFacilityPermissions } from "./useFacilityPermissions";

export function RequireFacilityAction({
  action,
  children
}: {
  action: FacilityAction;
  children: React.ReactNode;
}) {
  const { can } = useFacilityPermissions();

  if (!can(action)) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Access Required</Text>
        <Text style={{ opacity: 0.75 }}>
          You don’t have permission to perform this action.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
