import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getMyCertificates } from "../api/certificates";

export default function ProfileCertificatesScreen({ navigation }) {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await getMyCertificates();
      setCerts(res.data || res);
      setLoading(false);
    } catch (err) {
      console.log("Error loading certificates:", err.message);
      Alert.alert("Error", "Failed to load certificates");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <ScreenContainer>
        <Text>Loading certificates…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>My Certificates</Text>

      {certs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No certificates yet</Text>
          <Text style={styles.emptySubtext}>Complete courses to earn certificates</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={certs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.course}>{item.course.title}</Text>
                  <Text style={styles.date}>
                    ✓ Completed {new Date(item.completedAt).toLocaleDateString()}
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
                  <Text style={styles.btnText}>📄 View Certificate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() =>
                    navigation.navigate("VerifyCertificate", {
                      certificateId: item.certificateId
                    })
                  }
                >
                  <Text style={styles.verifyText}>🔐 Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    color: "#2c3e50"
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
});
