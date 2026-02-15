import { Redirect, Link } from "expo-router";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
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
    color: "#2563EB"
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
  }
});

/**
 * Commercial Home Screen
 *
 * Landing page for commercial mode users (brands, sellers, marketers).
 * Shows brand dashboard, campaigns, offers, storefront management.
 *
 * Users navigate from here to:
 * - /feed → Commercial feed
 * - /campaigns → Marketing campaigns
 * - /offers → Offers management
 * - /storefront → Storefront settings
 * - /courses → Create/sell courses
 * - /profile → Account settings
 */
export default function CommercialHome() {
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();
  const plan = ent.plan || "commercial";

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
            {auth.user?.email} · {plan} plan
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
          <Text style={styles.sectionTitle}>⚠️ Action Required</Text>
          <AppCard style={styles.warningCard}>
            <Text style={styles.cardTitle}>Select a Facility</Text>
            <Text style={styles.cardDesc}>
              You have access to facilities. Select one to manage.
            </Text>

            <Link href="/facilities" asChild>
              <Text style={styles.link}>Select Facility →</Text>
            </Link>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketing & Sales</Text>

        <AppCard>
          <Text style={styles.cardTitle}>📱 Feed</Text>
          <Text style={styles.cardDesc}>
            Your brand{"'"}s content feed, engagement, and reach
          </Text>

          <Link href="/feed" asChild>
            <Text style={styles.link}>View Feed →</Text>
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>🎯 Campaigns</Text>
          <Text style={styles.cardDesc}>Create and manage marketing campaigns</Text>

          <Link href="/campaigns" asChild>
            <Text style={styles.link}>Manage Campaigns →</Text>
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>💰 Offers</Text>
          <Text style={styles.cardDesc}>Special offers, promotions, and deals</Text>

          <Link href="/offers" asChild>
            <Text style={styles.link}>Manage Offers →</Text>
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Commerce</Text>

        <AppCard>
          <Text style={styles.cardTitle}>🏪 Storefront</Text>
          <Text style={styles.cardDesc}>
            Manage your online storefront and product listings
          </Text>

          <Link href="/storefront" asChild>
            <Text style={styles.link}>Manage Storefront →</Text>
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>📦 Orders</Text>
          <Text style={styles.cardDesc}>
            Track orders, fulfillment, and customer interactions
          </Text>

          <Link href="/orders" asChild>
            <Text style={styles.link}>View Orders →</Text>
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>📊 Inventory</Text>
          <Text style={styles.cardDesc}>Manage product inventory and stock levels</Text>

          <Link href="/home/commercial/inventory" asChild>
            <Text style={styles.link}>Manage Inventory →</Text>
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content & Community</Text>

        <AppCard>
          <Text style={styles.cardTitle}>📚 Courses</Text>
          <Text style={styles.cardDesc}>Create and sell educational courses</Text>

          <Link href="/courses" asChild>
            <Text style={styles.link}>Manage Courses →</Text>
          </Link>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>👥 Communities</Text>
          <Text style={styles.cardDesc}>Build and manage brand communities</Text>

          <Link href="/communities" asChild>
            <Text style={styles.link}>Manage Communities →</Text>
          </Link>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <AppCard>
          <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
          <Text style={styles.cardDesc}>Account settings, team management, billing</Text>

          <Link href="/profile" asChild>
            <Text style={styles.link}>Open Profile →</Text>
          </Link>
        </AppCard>
      </View>
    </AppPage>
  );
}
