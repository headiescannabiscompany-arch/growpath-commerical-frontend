import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import AppPage from "@/components/layout/AppPage";
import AppCard from "@/components/layout/AppCard";

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A"
  }
});

/**
 * Personal Home Screen (Tab: Home)
 *
 * Landing page for personal mode users (free/pro/creator_plus).
 */
export default function PersonalHomeTab() {
  const auth = useAuth();
  const ent = useEntitlements();
  const plan = ent.plan || "free";

  console.log("[ROUTE] /home/personal rendered");

  return (
    <AppPage
      routeKey="home"
      header={
        <View>
          <Text style={styles.headerTitle}>Your Garden</Text>
          <Text style={styles.headerSubtitle}>
            {auth.user?.email} · {plan} plan
          </Text>
        </View>
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <AppCard>
          <Text style={styles.cardTitle}>🌱 Grows & Plants</Text>
          <Text style={styles.cardDesc}>
            Track your grows, log activities, monitor plant health
          </Text>
          <Link href="/home/personal/grows" style={styles.link}>
            View Grows →
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>📝 Grow Logs</Text>
          <Text style={styles.cardDesc}>
            Daily notes, photos, measurements, and progress tracking
          </Text>
          <Link href="/home/personal/logs" style={styles.link}>
            Open Logs →
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>🔬 Diagnose</Text>
          <Text style={styles.cardDesc}>
            AI-powered plant diagnosis and issue detection
          </Text>
          <Link href="/home/personal/diagnose" style={styles.link}>
            Diagnose Issues →
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Growing Tools</Text>

        <AppCard>
          <Text style={styles.cardTitle}>🧪 Calculators & Tools</Text>
          <Text style={styles.cardDesc}>
            Soil calc, NPK, VPD, feed scheduler, harvest estimator
          </Text>
          <Link href="/home/personal/tools" style={styles.link}>
            Open Tools →
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning & Community</Text>

        <AppCard>
          <Text style={styles.cardTitle}>📚 Courses</Text>
          <Text style={styles.cardDesc}>
            Browse courses, track progress, earn certificates
          </Text>
          <Link href="/home/personal/courses" style={styles.link}>
            Browse Courses →
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>💬 Forum</Text>
          <Text style={styles.cardDesc}>
            Connect with growers, ask questions, share knowledge
          </Text>
          <Link href="/home/personal/forum" style={styles.link}>
            Open Forum →
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <AppCard>
          <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
          <Text style={styles.cardDesc}>
            Account settings, preferences, plan management
          </Text>
          <Link href="/home/personal/profile" style={styles.link}>
            Open Profile →
          </Link>
        </AppCard>
      </View>
    </AppPage>
  );
}
