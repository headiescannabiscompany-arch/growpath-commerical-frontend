import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#666"
  },
  content: {
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  link: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50"
  }
});

/**
 * Personal Home Screen
 *
 * Landing page for personal mode users (free/pro/creator_plus).
 * Shows quick access to grows, plants, tools, learning features.
 *
 * Users navigate from here to:
 * - /grows → Grows list
 * - /logs → Grow logs
 * - /tools → Tools hub
 * - /diagnose → AI diagnosis
 * - /courses → Courses
 * - /forum → Community forum
 * - /profile → Account settings
 */
export default function PersonalHome() {
  const auth = useAuth();
  const ent = useEntitlements();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Garden</Text>
        <Text style={styles.subtitle}>
          {auth.user?.email} · {ent.plan || "free"} plan
        </Text>
      </View>

      <View style={styles.content}>
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌱 Grows & Plants</Text>
            <Text style={styles.cardDesc}>
              Track your grows, log activities, monitor plant health
            </Text>
            <Link href="/grows" style={styles.link}>
              View Grows →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Grow Logs</Text>
            <Text style={styles.cardDesc}>
              Daily notes, photos, measurements, and progress tracking
            </Text>
            <Link href="/logs" style={styles.link}>
              Open Logs →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔬 Diagnose</Text>
            <Text style={styles.cardDesc}>
              AI-powered plant diagnosis and issue detection
            </Text>
            <Link href="/diagnose" style={styles.link}>
              Diagnose Issues →
            </Link>
          </View>
        </View>

        {/* Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growing Tools</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧪 Calculators & Tools</Text>
            <Text style={styles.cardDesc}>
              Soil calc, NPK, VPD, feed scheduler, harvest estimator
            </Text>
            <Link href="/tools" style={styles.link}>
              Open Tools →
            </Link>
          </View>
        </View>

        {/* Learning Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning & Community</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Courses</Text>
            <Text style={styles.cardDesc}>
              Browse courses, track progress, earn certificates
            </Text>
            <Link href="/courses" style={styles.link}>
              Browse Courses →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💬 Forum</Text>
            <Text style={styles.cardDesc}>
              Connect with growers, ask questions, share knowledge
            </Text>
            <Link href="/forum" style={styles.link}>
              Open Forum →
            </Link>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
            <Text style={styles.cardDesc}>
              Account settings, preferences, plan management
            </Text>
            <Link href="/profile" style={styles.link}>
              Open Profile →
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
