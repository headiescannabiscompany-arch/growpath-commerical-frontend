import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { verifyCertificate } from "../api/certificates";

export default function VerifyCertificateScreen({ route }) {
  const { certificateId } = route.params;
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await verifyCertificate(certificateId);
        setCert(res.data || res);
        setLoading(false);
      } catch (err) {
        setError("Certificate not found or invalid");
        setLoading(false);
      }
    }

    load();
  }, [certificateId]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Verifying certificate…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !cert?.valid) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Invalid Certificate</Text>
          <Text style={styles.errorText}>
            {error || "This certificate could not be verified"}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.icon}>✓</Text>
        <Text style={styles.title}>Certificate Verified</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Student Name</Text>
          <Text style={styles.value}>{cert.student}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Course</Text>
          <Text style={styles.value}>{cert.course}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Completion Date</Text>
          <Text style={styles.value}>
            {new Date(cert.completedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Certificate ID</Text>
          <Text style={[styles.value, styles.mono]}>{cert.certificateId}</Text>
        </View>
      </View>

      <View style={styles.validationBadge}>
        <Text style={styles.validationIcon}>🔐</Text>
        <Text style={styles.validationText}>This certificate is authentic</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = {
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e74c3c",
    marginBottom: 12
  },
  errorText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center"
  },
  header: {
    alignItems: "center",
    marginBottom: 24
  },
  icon: {
    fontSize: 48,
    marginBottom: 12
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#27ae60"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  label: {
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  value: {
    fontSize: 15,
    color: "#2c3e50",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 12
  },
  mono: {
    fontFamily: "Courier New",
    fontSize: 12
  },
  divider: {
    height: 1,
    backgroundColor: "#eee"
  },
  validationBadge: {
    backgroundColor: "#d5f4e6",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60"
  },
  validationIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  validationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#27ae60"
  }
};
