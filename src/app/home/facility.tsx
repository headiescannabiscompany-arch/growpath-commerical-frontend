import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";

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
    color: "#FF9800"
  },
  warningCard: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FF9800"
  }
});

/**
 * Facility Home Screen
 *
 * Landing page for facility mode users (multi-user operations).
 * Shows facility dashboard, rooms, tasks, compliance, team management.
 *
 * Users navigate from here to:
 * - /facilities → Facility picker (if no facility selected)
 * - /dashboard → Facility dashboard
 * - /rooms → Rooms management
 * - /tasks → Task management
 * - /team → Team & roles
 * - /compliance → Compliance tracking
 * - /profile → Account settings
 */
export default function FacilityHome() {
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();

  const selectedFacility = facility.facilities.find((f) => f.id === facility.selectedId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Facility Operations</Text>
        <Text style={styles.subtitle}>
          {auth.user?.email} · {ent.plan || "facility"} plan
        </Text>
        {selectedFacility && (
          <Text style={styles.subtitle}>Managing: {selectedFacility.name}</Text>
        )}
      </View>

      <View style={styles.content}>
        {/* Facility Selection Warning */}
        {!facility.selectedId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Action Required</Text>
            <View style={[styles.card, styles.warningCard]}>
              <Text style={styles.cardTitle}>Select a Facility</Text>
              <Text style={styles.cardDesc}>
                You need to select a facility to access operations, rooms, tasks, and team
                management.
              </Text>
              <Link href="/facilities" style={styles.link}>
                Select Facility →
              </Link>
            </View>
          </View>
        )}

        {/* Operations Section */}
        {facility.selectedId && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operations</Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Dashboard</Text>
                <Text style={styles.cardDesc}>
                  Overview, metrics, alerts, and quick actions
                </Text>
                <Link href="/dashboard" style={styles.link}>
                  Open Dashboard →
                </Link>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏢 Rooms</Text>
                <Text style={styles.cardDesc}>
                  Manage grow rooms, zones, and environmental controls
                </Text>
                <Link href="/rooms" style={styles.link}>
                  Manage Rooms →
                </Link>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>✅ Tasks</Text>
                <Text style={styles.cardDesc}>
                  Daily tasks, assignments, verification, and SOPs
                </Text>
                <Link href="/tasks" style={styles.link}>
                  View Tasks →
                </Link>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>📦 Inventory</Text>
                <Text style={styles.cardDesc}>
                  Track inventory, supplies, and stock levels
                </Text>
                <Link href="/inventory" style={styles.link}>
                  Manage Inventory →
                </Link>
              </View>
            </View>

            {/* Team & Compliance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team & Compliance</Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>👥 Team</Text>
                <Text style={styles.cardDesc}>
                  Manage team members, roles, and permissions
                </Text>
                <Link href="/team" style={styles.link}>
                  Manage Team →
                </Link>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>📋 Compliance</Text>
                <Text style={styles.cardDesc}>
                  Compliance tracking, audit logs, and reports
                </Text>
                <Link href="/compliance" style={styles.link}>
                  View Compliance →
                </Link>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>📝 SOPs</Text>
                <Text style={styles.cardDesc}>
                  Standard operating procedures and protocols
                </Text>
                <Link href="/sops" style={styles.link}>
                  Manage SOPs →
                </Link>
              </View>
            </View>
          </>
        )}

        {/* Facility Switcher */}
        {facility.facilities.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facility</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏭 Switch Facility</Text>
              <Text style={styles.cardDesc}>
                You have access to {facility.facilities.length} facilities
              </Text>
              <Link href="/facilities" style={styles.link}>
                Switch Facility →
              </Link>
            </View>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
            <Text style={styles.cardDesc}>
              Account settings, preferences, notifications
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
