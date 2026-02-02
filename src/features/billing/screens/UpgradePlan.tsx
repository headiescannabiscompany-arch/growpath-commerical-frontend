import React from "react";
import { View, Text, Button } from "react-native";
import { useBilling } from "../hooks";

export default function UpgradePlan() {
  const billing = useBilling();

  const handleUpgrade = async (priceId: string) => {
    const checkout = await billing.createCheckout(priceId);
    if (checkout?.url) {
      window.location.href = checkout.url;
    }
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Upgrade Plan</Text>
      <Button title="Upgrade to Pro" onPress={() => handleUpgrade("price_pro")} />
      <Button
        title="Upgrade to Commercial"
        onPress={() => handleUpgrade("price_commercial")}
      />
      <Button
        title="Upgrade to Facility"
        onPress={() => handleUpgrade("price_facility")}
      />
    </View>
  );
}
