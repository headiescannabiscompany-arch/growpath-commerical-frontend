import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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

      // Auto-navigate after successful selection
      setTimeout(() => {
        router.push("/dashboard");
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <Text style={styles.title}>Select a Facility</Text>
      <Text style={styles.subtitle}>Choose which facility you want to manage</Text>

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
            Contact your administrator if you think this is incorrect.
          </Text>
        </View>
      ) : (
        <View style={styles.facilitiesList}>
          {facilities.map((fac) => (
            <TouchableOpacity
              key={fac.id}
              style={[
                styles.facilityCard,
                selectedId === fac.id && styles.facilityCardSelected
              ]}
              onPress={() => handleSelectFacility(fac.id)}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.facilityName}>{fac.name}</Text>
              <Text style={styles.facilityDetail}>Tier: {fac.tier || "N/A"}</Text>
              {fac.licenseNumber && (
                <Text style={styles.facilityDetail}>License: {fac.licenseNumber}</Text>
              )}
              {fac.state && <Text style={styles.facilityDetail}>State: {fac.state}</Text>}
              {selectedId === fac.id && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
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
