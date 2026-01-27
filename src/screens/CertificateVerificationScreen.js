import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";

export default function CertificateVerificationScreen() {
  const [code, setCode] = useState("");

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Verify Certificate</Text>
      <TextInput
        placeholder="Enter certificate ID"
        value={code}
        onChangeText={setCode}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <Button title="Verify" onPress={() => alert("Valid")} />
    </View>
  );
}
