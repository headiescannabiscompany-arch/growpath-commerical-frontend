import React from "react";
import { View, Text, Button } from "react-native";

export default function CreatorDashboard({ navigation }) {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold" }}>Creator Dashboard</Text>
      <Button title="Create Course" onPress={() => navigation.navigate("Courses")} />
      <Button title="Campaigns" onPress={() => navigation.navigate("Campaigns")} />
      <Button title="Certificates" onPress={() => navigation.navigate("Certificates")} />
    </View>
  );
}
