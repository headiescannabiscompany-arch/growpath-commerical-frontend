import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { verifyCertificate } from "../api/certificates";

export default function CertificateVerificationScreen() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");

  async function verify() {
    const id = code.trim();
    if (!id) {
      setResult("Enter a certificate ID.");
      return;
    }
    setChecking(true);
    setResult("");
    try {
      const response = await verifyCertificate(id);
      const valid = response?.valid ?? response?.certificate?.valid ?? response?.ok;
      const owner =
        response?.certificate?.userName ||
        response?.certificate?.recipientName ||
        response?.user?.name ||
        "";
      setResult(
        valid
          ? `Certificate verified${owner ? ` for ${owner}` : ""}.`
          : "Certificate not verified."
      );
    } catch (error) {
      setResult(error?.message || "Unable to verify certificate.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Verify Certificate</Text>
      <TextInput
        placeholder="Enter certificate ID"
        value={code}
        onChangeText={setCode}
        style={{ borderWidth: 1, padding: 10 }}
      />
      {result ? <Text style={{ marginVertical: 8 }}>{result}</Text> : null}
      <Button
        title={checking ? "Verifying..." : "Verify"}
        onPress={verify}
        disabled={checking}
      />
    </View>
  );
}
