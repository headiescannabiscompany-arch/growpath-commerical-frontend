import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    // navigation.replace("App");
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12, fontWeight: "700" }}>Loading…</Text>
    </View>
  );
}

export { default } from "../../../src/screens/personal/GrowsScreen.tsx";
