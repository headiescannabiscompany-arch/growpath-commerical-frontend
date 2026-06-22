import React, { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { getMyCertificates } from "../api/certificates";
import ScreenContainer from "../components/ScreenContainer";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";

function normalizeCertificates(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.certificates)) return response.certificates;
  return [];
}

export default function ProfileCertificatesScreen({ navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!access.canUseCertificates) {
      setCerts([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getMyCertificates();
      setCerts(normalizeCertificates(res));
    } catch (err) {
      console.log("Error loading certificates:", err.message);
      Alert.alert("Error", "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [access.canUseCertificates]);

  if (loading) {
    return (
      <ScreenContainer>
        <Text>Loading certificates...</Text>
      </ScreenContainer>
    );
  }

  if (!access.canUseCertificates) {
    return (
      <ScreenContainer>
        <Text style={styles.header}>My Certificates</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Certificates unavailable</Text>
          <Text style={styles.emptySubtext}>
            This account does not have COURSES_CERTIFICATES.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>My Certificates</Text>
      {access.maxCertificates !== null ? (
        <Text style={styles.limitText}>Certificate limit: {access.maxCertificates}</Text>
      ) : null}

      {certs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No certificates yet</Text>
          <Text style={styles.emptySubtext}>Complete courses to earn certificates</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={certs}
          keyExtractor={(item) => String(item._id || item.id || item.certificateId)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.course}>{item.course?.title || item.courseTitle}</Text>
                  <Text style={styles.date}>
                    Completed {new Date(item.completedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Earned</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => navigation.navigate("CertificateViewer", { cert: item })}
                >
                  <Text style={styles.btnText}>View Certificate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() =>
                    navigation.navigate("VerifyCertificate", {
                      certificateId: item.certificateId
                    })
                  }
                >
                  <Text style={styles.verifyText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = {
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    color: "#2c3e50"
  },
  limitText: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 12
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999"
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 14,
    borderRadius: 10,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#f39c12"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  course: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 6
  },
  date: {
    fontSize: 13,
    color: "#27ae60"
  },
  badge: {
    backgroundColor: "#d5f4e6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#27ae60"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  btn: {
    flex: 1,
    backgroundColor: "#3498db",
    padding: 11,
    borderRadius: 8,
    alignItems: "center"
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13
  },
  verifyBtn: {
    flex: 1,
    backgroundColor: "#27ae60",
    padding: 11,
    borderRadius: 8,
    alignItems: "center"
  },
  verifyText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 13
  }
};
