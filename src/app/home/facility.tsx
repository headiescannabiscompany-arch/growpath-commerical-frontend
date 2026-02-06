import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";
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
    color: "#D97706"
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
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
  const plan = ent.plan || "facility";

  const selectedFacility = facility.facilities.find((f) => f.id === facility.selectedId);

  return (
    <AppPage
      routeKey="home_facility"
      header={
        <View>
          <Text style={styles.headerTitle}>Facility Operations</Text>
          <Text style={styles.headerSubtitle}>
            {auth.user?.email} · {plan} plan
          </Text>
          {selectedFacility ? (
            <Text style={styles.headerSubtitle}>Managing: {selectedFacility.name}</Text>
          ) : null}
        </View>
      }
    >
      {!facility.selectedId ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Action Required</Text>
          <AppCard style={styles.warningCard}>
            <Text style={styles.cardTitle}>Select a Facility</Text>
            <Text style={styles.cardDesc}>
              You need to select a facility to access operations, rooms, tasks, and team
              management.
            </Text>
            <Link href="/facilities" style={styles.link}>
              Select Facility →
            </Link>
          </AppCard>
        </View>
      ) : null}

      {facility.selectedId ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operations</Text>

            <AppCard>
              <Text style={styles.cardTitle}>📊 Dashboard</Text>
              <Text style={styles.cardDesc}>
                Overview, metrics, alerts, and quick actions
              </Text>
              <Link
                href={`/facilities/${facility.selectedId}/dashboard`}
                style={styles.link}
              >
                Open Dashboard →
              </Link>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>🏢 Rooms</Text>
              <Text style={styles.cardDesc}>
                Manage grow rooms, zones, and environmental controls
              </Text>
              <Link href={`/facilities/${facility.selectedId}/rooms`} style={styles.link}>
                Manage Rooms →
              </Link>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>✅ Tasks</Text>
              <Text style={styles.cardDesc}>
                Daily tasks, assignments, verification, and SOPs
              </Text>
              <Link href={`/facilities/${facility.selectedId}/tasks`} style={styles.link}>
                View Tasks →
              </Link>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>📦 Inventory</Text>
              <Text style={styles.cardDesc}>
                Track inventory, supplies, and stock levels
              </Text>
              <Link
                href={`/facilities/${facility.selectedId}/inventory`}
                style={styles.link}
              >
                Manage Inventory →
              </Link>
            </AppCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team & Compliance</Text>

            <AppCard>
              <Text style={styles.cardTitle}>👥 Team</Text>
              <Text style={styles.cardDesc}>
                Manage team members, roles, and permissions
              </Text>
              <Link href={`/facilities/${facility.selectedId}/team`} style={styles.link}>
                Manage Team →
              </Link>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>📋 Compliance</Text>
              <Text style={styles.cardDesc}>
                Compliance tracking, audit logs, and reports
              </Text>
              <Link
                href={`/facilities/${facility.selectedId}/compliance`}
                style={styles.link}
              >
                View Compliance →
              </Link>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>📝 SOPs</Text>
              <Text style={styles.cardDesc}>
                Standard operating procedures and protocols
              </Text>
              <Link href={`/facilities/${facility.selectedId}/sops`} style={styles.link}>
                Manage SOPs →
              </Link>
            </AppCard>
          </View>
        </>
      ) : null}

      {facility.facilities.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facility</Text>
          <AppCard>
            <Text style={styles.cardTitle}>🏭 Switch Facility</Text>
            <Text style={styles.cardDesc}>
              You have access to {facility.facilities.length} facilities
            </Text>
            <Link href="/facilities" style={styles.link}>
              Switch Facility →
            </Link>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <AppCard>
          <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
          <Text style={styles.cardDesc}>
            Account settings, preferences, notifications
          </Text>
          <Link href="/profile" style={styles.link}>
            Open Profile →
          </Link>
        </AppCard>
      </View>
    </AppPage>
  );
}
