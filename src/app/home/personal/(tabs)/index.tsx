import React from "react";
import { Link } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

const styles = StyleSheet.create({
  headerTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#64748B" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#475569", marginBottom: 10 },
  link: { fontSize: 14, fontWeight: "700", color: "#166534" }
});

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} asChild>
      <Text style={styles.link}>{label}</Text>
    </Link>
  );
}

export default function PersonalHomeTab() {
  const auth = useAuth();
  const ent = useEntitlements();
  const plan = ent.plan || "free";

  return (
    <AppPage
      routeKey="home"
      header={
        <View>
          <Text style={styles.headerTitle}>Your Garden</Text>
          <Text style={styles.headerSubtitle}>
            {[auth.user?.email, `${plan} plan`].filter(Boolean).join(" | ")}
          </Text>
        </View>
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <AppCard>
          <Text style={styles.cardTitle}>Grows</Text>
          <Text style={styles.cardDesc}>
            Open your active grows, review progress, and continue from recent activity.
          </Text>
          <NavLink href="/home/personal/grows" label="Open Grows ->" />
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Tools</Text>
          <Text style={styles.cardDesc}>
            Run calculators and save outputs to your grow history.
          </Text>
          <NavLink href="/home/personal/tools" label="Open Tools ->" />
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community</Text>
        <AppCard>
          <Text style={styles.cardTitle}>Learn and Forum</Text>
          <Text style={styles.cardDesc}>
            Browse courses and participate in the growers forum from one place.
          </Text>
          <NavLink href="/home/personal/community" label="Open Community ->" />
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <AppCard>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDesc}>
            Manage account details and sign in to other account types.
          </Text>
          <NavLink href="/home/personal/profile" label="Open Profile ->" />
        </AppCard>
      </View>
    </AppPage>
  );
}
