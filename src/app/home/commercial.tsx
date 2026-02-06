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
    color: "#2196F3"
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Brand Dashboard</Text>
        <Text style={styles.subtitle}>
          {auth.user?.email} · {ent.plan || "commercial"} plan
        </Text>
        {facility.selectedId && (
          <Text style={styles.subtitle}>
            Managing:{" "}
            {facility.facilities.find((f) => f.id === facility.selectedId)?.name}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        {/* Facility Management (if applicable) */}
        {!facility.selectedId && facility.facilities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Action Required</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select a Facility</Text>
              <Text style={styles.cardDesc}>
                You have access to facilities. Select one to manage.
              </Text>
              <Link href="/facilities" style={styles.link}>
                Select Facility →
              </Link>
            </View>
          </View>
        )}

        {/* Marketing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing & Sales</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Feed</Text>
            <Text style={styles.cardDesc}>
              Your brand's content feed, engagement, and reach
            </Text>
            <Link href="/feed" style={styles.link}>
              View Feed →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Campaigns</Text>
            <Text style={styles.cardDesc}>Create and manage marketing campaigns</Text>
            <Link href="/campaigns" style={styles.link}>
              Manage Campaigns →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Offers</Text>
            <Text style={styles.cardDesc}>Special offers, promotions, and deals</Text>
            <Link href="/offers" style={styles.link}>
              Manage Offers →
            </Link>
          </View>
        </View>

        {/* Commerce Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commerce</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏪 Storefront</Text>
            <Text style={styles.cardDesc}>
              Manage your online storefront and product listings
            </Text>
            <Link href="/storefront" style={styles.link}>
              Manage Storefront →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📦 Orders</Text>
            <Text style={styles.cardDesc}>
              Track orders, fulfillment, and customer interactions
            </Text>
            <Link href="/orders" style={styles.link}>
              View Orders →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Inventory</Text>
            <Text style={styles.cardDesc}>Manage product inventory and stock levels</Text>
            <Link href="/inventory" style={styles.link}>
              Manage Inventory →
            </Link>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content & Community</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Courses</Text>
            <Text style={styles.cardDesc}>Create and sell educational courses</Text>
            <Link href="/courses" style={styles.link}>
              Manage Courses →
            </Link>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Communities</Text>
            <Text style={styles.cardDesc}>Build and manage brand communities</Text>
            <Link href="/communities" style={styles.link}>
              Manage Communities →
            </Link>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚙️ Profile & Settings</Text>
            <Text style={styles.cardDesc}>
              Account settings, team management, billing
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
