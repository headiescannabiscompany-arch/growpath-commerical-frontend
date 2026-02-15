/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useBilling } from "../hooks";
import { useEntitlements } from "../../../entitlements";

export default function BillingSuccess() {
  const billing = useBilling();
  const entitlements = useEntitlements();

  useEffect(() => {
    billing.getPlan().then((plan) => {
      if (entitlements.refresh) entitlements.refresh(plan.plan);
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>🎉 Subscription active!</Text>
      <Text style={{ marginTop: 12 }}>
        Your plan has been upgraded and features are now unlocked.
      </Text>
    </View>
  );
}
