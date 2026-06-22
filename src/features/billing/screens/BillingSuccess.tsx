import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { getSubscriptionStatus } from "../../../api/subscription";

export default function BillingSuccess() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function poll() {
      setError("");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const next = await getSubscriptionStatus();
          if (!alive) return;
          setStatus(next);
          const subscriptionStatus = next?.status || next?.subscriptionStatus;
          if (subscriptionStatus === "active") return;
        } catch (err: any) {
          if (!alive) return;
          setError(err?.message || "Unable to confirm subscription.");
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    poll();
    return () => {
      alive = false;
    };
  }, []);

  const subscriptionStatus = status?.status || status?.subscriptionStatus || "pending";
  const active = subscriptionStatus === "active";

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
      {!active ? <ActivityIndicator /> : null}
      <Text style={{ fontSize: 22, fontWeight: "bold", textAlign: "center" }}>
        {active ? "Subscription confirmed" : "Payment received, waiting for confirmation"}
      </Text>
      <Text style={{ marginTop: 12, textAlign: "center" }}>
        Status: {subscriptionStatus}. Features unlock only after the backend confirms the
        subscription state.
      </Text>
      {error ? <Text style={{ marginTop: 12, color: "crimson" }}>{error}</Text> : null}
    </View>
  );
}
