import React from "react";
import { View, Text, Button } from "react-native";
import { useBilling } from "../hooks";

export default function ManageSubscription() {
  const billing = useBilling();

  const handlePortal = async () => {
    const portal = await billing.openPortal();
    if (portal?.url) {
      window.location.href = portal.url;
    }
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Manage Subscription</Text>
      <Button title="Open Stripe Portal" onPress={handlePortal} />
    </View>
  );
}
