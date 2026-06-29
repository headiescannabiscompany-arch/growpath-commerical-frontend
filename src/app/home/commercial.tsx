import { Redirect, Link } from "expo-router";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";
import { canAccessRoute } from "@/navigation/routeAccess";

type ActionCardProps = {
  title: string;
  description: string;
  href?: string;
  status?: string;
};

function ActionCard({ title, description, href, status }: ActionCardProps) {
  return (
    <AppCard style={!href ? styles.disabledCard : undefined}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {status ? <Text style={styles.statusPill}>{status}</Text> : null}
      </View>
      <Text style={styles.cardDesc}>{description}</Text>
      {href ? (
        <Link href={href as any} asChild>
          <Text style={styles.link}>Open {title}</Text>
        </Link>
      ) : (
        <Text style={styles.disabledText}>Queued for buildout</Text>
      )}
    </AppCard>
  );
}

export default function CommercialHome() {
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();
  const plan = ent.plan || "commercial";
  const canOpen = (pathname: string) =>
    canAccessRoute(pathname, {
      ready: ent.ready,
      mode: ent.mode,
      capabilities: ent.capabilities
    });

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") {
    return <Redirect href="/home/personal" />;
  }

  return (
    <AppPage
      routeKey="home"
      header={
        <View>
          <Text style={styles.headerTitle}>Brand Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {auth.user?.email} | {plan} plan
          </Text>
          {facility.selectedId ? (
            <Text style={styles.headerSubtitle}>
              Managing:{" "}
              {facility.facilities.find((f) => f.id === facility.selectedId)?.name}
            </Text>
          ) : null}
        </View>
      }
    >
      {!facility.selectedId && facility.facilities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Required</Text>
          <AppCard style={styles.warningCard}>
            <Text style={styles.cardTitle}>Select a Facility</Text>
            <Text style={styles.cardDesc}>
              You have access to facilities. Select one to manage facility-specific work.
            </Text>
            <Link href="/facilities" asChild>
              <Text style={styles.link}>Select Facility</Text>
            </Link>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Commerce</Text>
        {canOpen("/home/commercial/inventory") ? (
          <ActionCard
            title="Inventory"
            description="Track stock, reorder points, vendors, categories, and item status."
            href="/home/commercial/inventory"
            status="Live"
          />
        ) : null}
        {canOpen("/storefront") ? (
          <ActionCard
            title="Storefront"
            description="Manage public storefront settings and product listings."
            href="/storefront"
            status="Live"
          />
        ) : null}
        <ActionCard
          title="Orders"
          description="Review paid storefront orders, track revenue, and update fulfillment."
          href="/orders"
          status="Live"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketing & Community</Text>
        {canOpen("/feed") ? (
          <ActionCard
            title="Feed"
            description="Publish updates, listings, ISO requests, drops, questions, and education."
            href="/feed"
            status="Live"
          />
        ) : null}
        <ActionCard
          title="Campaigns"
          description="Plan campaigns, manage budgets, and update promotional status."
          href="/campaigns"
          status="Live"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content & Account</Text>
        <ActionCard
          title="Courses"
          description="Open the course catalog and commercial education surfaces."
          href="/courses"
          status="Live"
        />
        <ActionCard
          title="Profile & Billing"
          description="Manage account settings, workspace mode, and checkout state."
          href="/profile"
          status="Live"
        />
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
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
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800"
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800"
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  link: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
  },
  disabledCard: {
    backgroundColor: "#F8FAFC"
  },
  disabledText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10
  },
  statusPill: {
    backgroundColor: "#D1FAE5",
    borderRadius: 999,
    color: "#065F46",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  }
});
