// CertificateVerificationScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { verifyCertificate } from "../../verifyCertificate.js";

export default function CertificateVerificationScreen() {
  const [certificateId, setCertificateId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleVerify() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await verifyCertificate(certificateId.trim());
      setResult(res);
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Certificate</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Certificate ID"
        value={certificateId}
        onChangeText={setCertificateId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleVerify}
        disabled={loading || !certificateId.trim()}
      >
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {result && result.valid && (
        <View style={styles.resultBox}>
          <Text style={styles.valid}>Certificate is valid!</Text>
          <Text style={styles.label}>Course:</Text>
          <Text>{result.certificate.course}</Text>
          <Text style={styles.label}>User:</Text>
          <Text>{result.certificate.user}</Text>
          <Text style={styles.label}>Completed At:</Text>
          <Text>{result.certificate.completedAt}</Text>
          {result.certificate.pdfUrl && <Text style={styles.label}>PDF:</Text>}
          {result.certificate.pdfUrl && (
            <Text style={styles.link}>{result.certificate.pdfUrl}</Text>
          )}
        </View>
      )}
      {result && !result.valid && (
        <Text style={styles.invalid}>Certificate not found or invalid.</Text>
      )}
      {error && <Text style={styles.invalid}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#2ecc71"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  button: {
    backgroundColor: "#2ecc71",
    borderRadius: 8,
    padding: 16,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  resultBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f0fff4",
    borderRadius: 8
  },
  valid: {
    color: "#27ae60",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8
  },
  invalid: {
    color: "#e74c3c",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 16
  },
  label: {
    fontWeight: "bold",
    marginTop: 8
  },
  link: {
    color: "#2980b9",
    textDecorationLine: "underline"
  }
});
