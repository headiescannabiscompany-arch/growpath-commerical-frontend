import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert
} from "react-native";
import { useFacility } from "@/facility/FacilityProvider";
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyMessage: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 16
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  facilitiesList: {
    marginBottom: 32
  },
  facilityCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9"
  },
  facilityCardSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "#f1f8f4"
  },
  facilityName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  facilityDetail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2
  },
  selectedBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#4CAF50",
    borderRadius: 4,
    alignSelf: "flex-start"
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff"
  },
  errorContainer: {
    backgroundColor: "#fee",
    borderColor: "#f99",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    fontSize: 12,
    color: "#d00",
    textAlign: "center"
  }
});

export default function FacilitiesScreen() {
  const router = useRouter();
  const facility = useFacility();
  const [selectedForAction, setSelectedForAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSelectFacility = async (facilityId: string) => {
    try {
      setActionLoading(true);
      setSelectedForAction(facilityId);
      await facility.selectFacility(facilityId);

      // Auto-navigate after successful selection.
      setTimeout(() => {
        router.push("/home/facility");
      }, 500);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to select facility");
      setSelectedForAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (facility.isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading facilities...</Text>
      </View>
    );
  }

  const { facilities, selectedId, error } = facility;
  const accountFacility = facilities[0] || null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <Text style={styles.title}>Your Facility</Text>
      <Text style={styles.subtitle}>
        Manage the single facility attached to this account
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {facilities.length === 0 ? (
        <View style={{ marginTop: 32 }}>
          <Text style={styles.emptyMessage}>
            No facilities available for your account.
          </Text>
          <Text style={styles.emptyMessage} numberOfLines={3}>
            Create your first facility to start rooms, grows, compliance, and team setup.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/onboarding/create-facility")}
            accessibilityRole="button"
            accessibilityLabel="Create facility"
          >
            <Text style={styles.primaryButtonText}>Create Facility</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.facilitiesList}>
          {accountFacility && (
            <Pressable
              key={accountFacility.id}
              style={[
                styles.facilityCard,
                selectedId === accountFacility.id && styles.facilityCardSelected
              ]}
              onPress={() => handleSelectFacility(accountFacility.id)}
              disabled={actionLoading}
              accessibilityRole="button"
              accessibilityLabel={`Select facility ${accountFacility.name}`}
            >
              <Text style={styles.facilityName}>{accountFacility.name}</Text>
              <Text style={styles.facilityDetail}>
                Tier: {accountFacility.tier || "N/A"}
              </Text>
              {accountFacility.licenseNumber && (
                <Text style={styles.facilityDetail}>
                  License: {accountFacility.licenseNumber}
                </Text>
              )}
              {accountFacility.state && (
                <Text style={styles.facilityDetail}>State: {accountFacility.state}</Text>
              )}
              {selectedId === accountFacility.id && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Active</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}

      {selectedForAction && actionLoading && (
        <View style={{ marginTop: 32, alignItems: "center" }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Switching facility...</Text>
        </View>
      )}
    </ScrollView>
  );
}
