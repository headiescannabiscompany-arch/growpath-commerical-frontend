import React from "react";
import { View, Text } from "react-native";

export default function CertificateViewer() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Certificate</Text>
      <Text>Issued to: John Collins</Text>
      <Text>Course: LAWNS Fundamentals</Text>
      <Text>Date: 2026</Text>
    </View>
  );
}
