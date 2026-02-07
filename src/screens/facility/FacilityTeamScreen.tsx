import React, { useState } from "react";
import { View, Text, FlatList, TextInput, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useFacilityTeam } from "../../hooks/useFacilityTeam";
import type { FacilityRole } from "../../api/team";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";

const ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"];

export default function FacilityTeamScreen() {
  const {
    data: members,
    isLoading,
    error,
    invite,
    updateRole,
    remove
  } = useFacilityTeam();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FacilityRole>("STAFF");

  const submitInvite = async () => {
    if (!email.trim()) return;
    await invite({ email, role });
    setEmail("");
    setRole("STAFF");
  };

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorState
        message="Failed to load team"
        onRetry={() => window.location.reload()}
      />
    );

  if (!members || members.length === 0) {
    return (
      <EmptyState
        title="No team members yet"
        description="Invite your first teammate to collaborate."
        actionLabel="Invite Teammate"
        onAction={submitInvite}
      />
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        Facility Team
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Invite email..."
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 }}
        />
        <Picker
          selectedValue={role}
          style={{ height: 40, width: 120 }}
          onValueChange={setRole}
        >
          {ROLES.map((r) => (
            <Picker.Item key={r} label={r} value={r} />
          ))}
        </Picker>
        <Pressable
          onPress={submitInvite}
          style={{ padding: 10, borderWidth: 1, borderRadius: 8 }}
        >
          <Text>Invite</Text>
        </Pressable>
      </View>
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <View>
              <Text style={{ fontWeight: "600" }}>{item.email}</Text>
              <Text style={{ opacity: 0.6 }}>{item.role}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Picker
                selectedValue={item.role}
                style={{ height: 32, width: 100 }}
                onValueChange={(newRole) =>
                  updateRole({ userId: item.id, role: newRole })
                }
              >
                {ROLES.map((r) => (
                  <Picker.Item key={r} label={r} value={r} />
                ))}
              </Picker>
              <Pressable onPress={() => remove(item.id)} style={{ marginLeft: 8 }}>
                <Text style={{ color: "red" }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
