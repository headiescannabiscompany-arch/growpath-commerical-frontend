import React from "react";
import { View, Text } from "react-native";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";

export default function CertificateViewer({ route }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const cert = route?.params?.cert || {};

  if (!access.canUseCertificates) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24 }}>Certificate unavailable</Text>
        <Text>This account does not have COURSES_CERTIFICATES.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Certificate</Text>
      <Text>Issued to: {cert.issuedTo || cert.user?.name || "Learner"}</Text>
      <Text>Course: {cert.course?.title || cert.courseTitle || "Course"}</Text>
      <Text>
        Date:{" "}
        {cert.completedAt
          ? new Date(cert.completedAt).toLocaleDateString()
          : cert.date || "Unknown"}
      </Text>
    </View>
  );
}
