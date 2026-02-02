import React from "react";
import { View, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function JoinFacilityFlow() {
  const navigation = useNavigation();
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Join a Facility</Text>
      <Text>To join a facility, please accept an invite link sent to your email.</Text>
      <Button title="Back to Home" onPress={() => navigation.navigate("Home")} />
    </View>
  );
}
