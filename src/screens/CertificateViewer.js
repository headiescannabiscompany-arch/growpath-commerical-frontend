import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from "react-native";
import { API_URL } from "../api/client";

export default function CertificateViewer({ route, navigation }) {
  const { cert } = route.params;

  const handleDownload = async () => {
    try {
      if (cert.pdfUrl) {
        const url = cert.pdfUrl.startsWith("http")
          ? cert.pdfUrl
          : `${API_URL}${cert.pdfUrl}`;

        await Linking.openURL(url);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open certificate");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Certificate</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.certPreview}>
          <Text style={styles.certIcon}>🏆</Text>
          <Text style={styles.certTitle}>Certificate of Completion</Text>
          <Text style={styles.certCourse}>{cert.course.title}</Text>
          <Text style={styles.certId}>ID: {cert.certificateId.slice(0, 8)}...</Text>
          <Text style={styles.certDate}>
            {new Date(cert.completedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Certificate Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Course:</Text>
            <Text style={styles.infoValue}>{cert.course.title}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completed:</Text>
            <Text style={styles.infoValue}>
              {new Date(cert.completedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Certificate ID:</Text>
            <Text style={styles.infoValue}>{cert.certificateId}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
          <Text style={styles.downloadText}>⬇ Download PDF</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Share your certificate ID to let others verify your achievement
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  backBtn: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3498db"
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50"
  },
  content: {
    flex: 1,
    padding: 16
  },
  certPreview: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: "#f39c12"
  },
  certIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  certTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8
  },
  certCourse: {
    fontSize: 16,
    fontWeight: "600",
    color: "#27ae60",
    marginBottom: 12,
    textAlign: "center"
  },
  certId: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6
  },
  certDate: {
    fontSize: 13,
    color: "#666"
  },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600"
  },
  infoValue: {
    fontSize: 14,
    color: "#2c3e50",
    fontWeight: "500",
    flex: 1,
    textAlign: "right"
  },
  downloadBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16
  },
  downloadText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  note: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic"
  }
});
