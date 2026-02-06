import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function HomeScreen() {
  const auth = useAuth();

  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Welcome!</Text>
      <Text style={{ fontSize: 16, color: "#666", marginBottom: 32 }}>
        Logged in as: {auth.user?.email}
      </Text>
      <Text style={{ fontSize: 14, color: "#999" }}>
        This is your personal home screen.
      </Text>
    </ScrollView>
  );
}
