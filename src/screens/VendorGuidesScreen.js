import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl
} from "react-native";

const VendorGuidesScreen = ({ navigation, route }) => {
  const vendorType = route?.params?.vendorType;
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorCount, setVendorCount] = useState(0);

  useEffect(() => {
    loadGuides();
  }, [vendorType]);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const url = vendorType
        ? `http://localhost:5001/api/courses/filter/by-vendor-type?vendorType=${vendorType}`
        : "http://localhost:5001/api/courses/featured/vendor-guides";

      const response = await fetch(url);
      const data = await response.json();

      setGuides(data.courses || data);
      setVendorCount(data.vendorCount);
    } catch (error) {
      console.log("Error loading guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGuides();
    setRefreshing(false);
  };

  const getVendorTypeLabel = () => {
    const labels = {
      soil: "Soil Company Guides",
      nutrients: "Nutrient Company Guides",
      genetics: "Genetics Company Guides",
      equipment: "Equipment Guides",
      supplements: "Supplement Guides"
    };
    return labels[vendorType] || "Vendor Guides";
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <FlatList
      data={guides}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.guideCard}
          onPress={() => navigation.navigate("Course", { courseId: item._id })}
        >
          <View style={styles.guideHeader}>
            <View style={styles.guideInfo}>
              <Text style={styles.guideTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.vendor && (
                <Text style={styles.vendorName}>by {item.vendor.companyName}</Text>
              )}
            </View>
            {item.price > 0 && (
              <Text style={styles.price}>${item.price}</Text>
            )}
          </View>

          <Text style={styles.guideDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.guideFooter}>
            <View style={styles.stats}>
              {item.enrollments > 0 && (
                <Text style={styles.stat}>{item.enrollments} enrolled</Text>
              )}
              {item.rating > 0 && (
                <Text style={styles.stat}>⭐ {item.rating.toFixed(1)}</Text>
              )}
            </View>
            {item.targetAudience && (
              <Text style={styles.audience}>
                {item.targetAudience === "both" ? "All growers" : item.targetAudience}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No guides yet</Text>
          <Text style={styles.emptySubtext}>
            {vendorType ? `Check back soon for ${getVendorTypeLabel()}` : "Featured vendor guides coming soon"}
          </Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.list}
      ListHeaderComponent={
        vendorType && (
          <View style={styles.header}>
            <Text style={styles.title}>{getVendorTypeLabel()}</Text>
            {vendorCount > 0 && (
              <Text style={styles.vendorCount}>from {vendorCount} verified companies</Text>
            )}
          </View>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb"
  },
  list: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4
  },
  vendorCount: {
    fontSize: 14,
    color: "#6b7280"
  },
  guideCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  guideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  guideInfo: {
    flex: 1,
    marginRight: 12
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937"
  },
  vendorName: {
    fontSize: 13,
    color: "#0ea5e9",
    fontWeight: "500",
    marginTop: 2
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#059669"
  },
  guideDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 18
  },
  guideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6"
  },
  stats: {
    flexDirection: "row",
    gap: 8
  },
  stat: {
    fontSize: 12,
    color: "#6b7280"
  },
  audience: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic"
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af"
  }
});

export default VendorGuidesScreen;
