import React from "react";
import { View, Text, Button } from "react-native";
import { useFacility } from "../../../facility/FacilityProvider";
import { useAuth } from "../../../auth/AuthContext";

export default function FacilitySettings() {
  const { facility } = useFacility();
  const { user } = useAuth();
  const isOwner = user?.id === facility?.ownerId;

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Facility Settings</Text>
      <Text>Name: {facility?.name}</Text>
      <Text>Type: {facility?.type}</Text>
      <Text>Owner: {facility?.ownerName}</Text>
      <Text>Created: {facility?.createdAt}</Text>
      <Text>Plan: {facility?.plan}</Text>
      <Text>Stripe: {facility?.stripeStatus}</Text>
      {isOwner && (
        <Button
          title="Edit Facility"
          onPress={() => {
            /* open edit modal */
          }}
        />
      )}
    </View>
  );
}
