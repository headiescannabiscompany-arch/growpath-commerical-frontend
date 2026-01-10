import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getFacilityDetail } from "../../api/facility";

const FacilityPicker = ({ navigation }) => {
  const { facilitiesAccess, setSelectedFacilityId, setMode } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacilities();
  }, [facilitiesAccess]);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const facilityDetails = await Promise.all(
        facilitiesAccess.map(fa => getFacilityDetail(fa.facilityId.toString()))
      );
      setFacilities(facilityDetails.filter(r => r.success).map(r => r.data));
    } catch (error) {
      console.log("Error loading facilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacility = async (facilityId) => {
    await setSelectedFacilityId(facilityId);
    await setMode("facility");
    navigation.reset({
      index: 0,
      routes: [{ name: "FacilityTabs" }]
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GrowPath Commercial</Text>
        <Text style={styles.headerSubtitle}>Select your business</Text>
      </View>
      <Text style={styles.title}>Available Businesses</Text>
      <FlatList
        data={facilities}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.facilityCard}
            onPress={() => handleSelectFacility(item._id)}
          >
            <View style={styles.facilityHeader}>
              <Text style={styles.facilityName}>{item.name}</Text>
              <Text style={styles.businessType}>
                {item.businessType ? item.businessType.replace(/_/g, ' ').toUpperCase() : 'CULTIVATOR'}
              </Text>
            </View>
            <Text style={styles.facilityInfo}>{item.address || "No address"}</Text>
            {item.licenseNumber && <Text style={styles.facilityInfo}>License: {item.licenseNumber}</Text>}
            <Text style={styles.planBadge}>{item.planType === 'premium' ? '💎 Premium' : '✅ Free'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No facilities available</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16
  },
  header: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0f2fe",
    fontWeight: "500"
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1f2937"
  },
  facilityCard: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9"
  },
  facilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  facilityName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1
  },
  businessType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  facilityInfo: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2
  },
  planBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
    marginTop: 8
  },
  empty: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 40
  }
});

export default FacilityPicker;
