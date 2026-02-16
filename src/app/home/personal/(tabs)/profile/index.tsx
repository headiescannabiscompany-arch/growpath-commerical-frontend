import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 18 },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12
  },
  rowLabel: { fontSize: 12, color: "#64748B" },
  rowValue: { marginTop: 4, fontSize: 15, fontWeight: "700" },

  button: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  buttonPrimary: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  buttonPrimaryText: { color: "#fff", fontWeight: "800" },

  buttonDanger: { backgroundColor: "#fff", borderColor: "#FCA5A5" },
  buttonDangerText: { color: "#DC2626", fontWeight: "800" }
});

export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();

  const email = auth.user?.email || "unknown";
  const mode = ent.mode || "personal";
  const plan = ent.plan || "free";

  const handleLogout = () => {
    Alert.alert("Log out?", "You’ll be returned to the login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            if (typeof (auth as any).logout === "function") {
              await (auth as any).logout();
            } else if (typeof (auth as any).setToken === "function") {
              (auth as any).setToken(null);
            }

            router.replace("/login" as any);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to log out");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account and plan details</Text>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Email</Text>
        <Text style={styles.rowValue}>{email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Mode</Text>
        <Text style={styles.rowValue}>{mode}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Plan</Text>
        <Text style={styles.rowValue}>{plan}</Text>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPrimary]}
        onPress={() =>
          Alert.alert(
            "Manage Plan",
            "Plan details and upgrades are available from your account settings."
          )
        }
      >
        <Text style={styles.buttonPrimaryText}>Manage Plan</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleLogout}>
        <Text style={styles.buttonDangerText}>Log out</Text>
      </Pressable>
    </View>
  );
}
