import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { api } from "../../../api/client";

export default function AcceptInvite() {
  const route = useRoute();
  const navigation = useNavigation() as any;
  const { token } = (route.params || {}) as any;
  const [invite, setInvite] = useState<any>(null); // Phase 2.3.2: Accept any for invite data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null); // Phase 2.3.2: Accept any for error

  useEffect(() => {
    api
      .get(`/api/invites/${token}`)
      .then(setInvite)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post(`/api/invites/${token}/accept`);
      navigation.navigate("Dashboard");
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await api.post(`/api/invites/${token}/decline`);
      navigation.navigate("Home");
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text>Loading…</Text>;
  if (error) return <Text>Error: {error.message || error.toString()}</Text>;
  if (!invite) return <Text>Invalid invite.</Text>;

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Join Facility</Text>
      <Text>Facility: {invite.facilityName}</Text>
      <Text>Invited by: {invite.inviterName}</Text>
      <Text>Role: {invite.role}</Text>
      <Button title="Accept" onPress={handleAccept} />
      <Button title="Decline" onPress={handleDecline} />
    </View>
  );
}
