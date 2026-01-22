// FacilityGuard.js: Blocks access if user is not a member or lacks required role/assignment
import React from "react";
import { View, Text } from "react-native";
import { useFacility } from "../context/FacilityContext";

export default function FacilityGuard({
  requiredRoles = [],
  requiredAssignments = {},
  children
}) {
  const { activeMembership, facilityCaps } = useFacility();

  // Not a member
  if (!activeMembership) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#ef4444", fontSize: 18 }}>
          Not a member of this facility.
        </Text>
      </View>
    );
  }

  // Role gating
  if (requiredRoles.length > 0 && !requiredRoles.includes(activeMembership.role)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#ef4444", fontSize: 18 }}>
          Access denied: insufficient role.
        </Text>
      </View>
    );
  }

  // Assignment gating (e.g., rooms)
  if (requiredAssignments.rooms) {
    const assignedRooms = facilityCaps.assignedRooms || [];
    const requiredRooms = requiredAssignments.rooms;
    const hasRoom = requiredRooms.some((room) => assignedRooms.includes(room));
    if (!hasRoom) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#ef4444", fontSize: 18 }}>
            Access denied: not assigned to required room.
          </Text>
        </View>
      );
    }
  }

  // All checks passed
  return children;
}
