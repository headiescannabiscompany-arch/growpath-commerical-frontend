/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { View, Text, Button } from "react-native";
import { useBilling } from "../hooks";

export default function BillingHome() {
  const billing = useBilling();
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    billing.getPlan().then(setPlan);
  }, []);

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        Current Plan: {plan?.plan || "Loading..."}
      </Text>
      <Text style={{ marginVertical: 12 }}>
        Features: {JSON.stringify(plan?.features || {}, null, 2)}
      </Text>
      <Button title="Upgrade" onPress={() => billing.createCheckout("price_pro")} />
      <Button title="Manage" onPress={() => billing.openPortal()} />
    </View>
  );
}
