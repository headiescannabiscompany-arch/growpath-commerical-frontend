import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from "react-native";

import { apiRequest } from "@/api/apiRequest";

function normalizeGuidesResponse(res) {
  if (!res) return { guides: [], vendorCount: 0 };
  if (Array.isArray(res)) return { guides: res, vendorCount: 0 };
  if (Array.isArray(res.courses)) {
    return { guides: res.courses, vendorCount: Number(res.vendorCount || 0) };
  }
  if (Array.isArray(res.data)) {
    return { guides: res.data, vendorCount: Number(res.vendorCount || 0) };
  }
  if (Array.isArray(res?.data?.courses)) {
    return {
      guides: res.data.courses,
      vendorCount: Number(res.data.vendorCount || res.vendorCount || 0)
    };
  }
  const maybe =
    res.items || res.results || res.guides || res.vendorGuides || res.list || null;
  if (Array.isArray(maybe)) {
    return { guides: maybe, vendorCount: Number(res.vendorCount || 0) };
  }
  return { guides: [], vendorCount: Number(res.vendorCount || 0) };
}

function getVendorTypeLabel(vendorType) {
  const labels = {
    soil: "Soil Company Guides",
    nutrients: "Nutrient Company Guides",
    genetics: "Genetics Company Guides",
    equipment: "Equipment Guides",
    supplements: "Supplement Guides"
  };
  return labels[vendorType] || "Vendor Guides";
}

export default function VendorGuidesScreen({ navigation, route }) {
  const vendorType = route?.params?.vendorType;

  const [guides, setGuides] = useState([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const title = useMemo(() => getVendorTypeLabel(vendorType), [vendorType]);

  const buildPath = useCallback(() => {
    if (vendorType) {
      const q = encodeURIComponent(String(vendorType));
      return `/api/courses/filter/by-vendor-type?vendorType=${q}`;
    }
    return "/api/courses/featured/vendor-guides";
  }, [vendorType]);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const path = buildPath();
      const res = await apiRequest(path, { method: "GET" });
      const norm = normalizeGuidesResponse(res);
      setGuides(Array.isArray(norm.guides) ? norm.guides : []);
      setVendorCount(Number(norm.vendorCount || 0));
    } catch (err) {
      // Deterministic: don't crash screen; show empty state
      console.log("Error loading guides:", err?.message || String(err));
      setGuides([]);
      setVendorCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildPath]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const path = buildPath();
      const res = await apiRequest(path, { method: "GET" });
      const norm = normalizeGuidesResponse(res);
      setGuides(Array.isArray(norm.guides) ? norm.guides : []);
      setVendorCount(Number(norm.vendorCount || 0));
    } catch (err) {
      console.log("Error refreshing guides:", err?.message || String(err));
      setGuides([]);
      setVendorCount(0);
    } finally {
      setRefreshing(false);
    }
  }, [buildPath]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

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
      keyExtractor={(item, idx) => String(item?._id || item?.id || idx)}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.guideCard}
          onPress={() =>
            navigation?.navigate?.("Course", { courseId: item?._id || item?.id })
          }
        >
          <View style={styles.guideHeader}>
            <View style={styles.guideInfo}>
              <Text style={styles.guideTitle} numberOfLines={2}>
                {item?.title || "Untitled guide"}
              </Text>
              {item?.vendor?.companyName ? (
                <Text style={styles.vendorName}>by {item.vendor.companyName}</Text>
              ) : null}
            </View>
            {Number(item?.price || 0) > 0 ? (
              <Text style={styles.price}>${Number(item.price).toFixed(0)}</Text>
            ) : null}
          </View>

          {item?.description ? (
            <Text style={styles.guideDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.guideFooter}>
            <View style={styles.stats}>
              {Number(item?.enrollments || 0) > 0 ? (
                <Text style={styles.stat}>{item.enrollments} enrolled</Text>
              ) : null}
              {Number(item?.rating || 0) > 0 ? (
                <Text style={styles.stat}>⭐ {item.rating.toFixed(1)}</Text>
              ) : null}
            </View>
            {item?.targetAudience ? (
              <Text style={styles.audience}>
                {item.targetAudience === "both" ? "All growers" : item.targetAudience}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No guides yet</Text>
          <Text style={styles.emptySubtext}>
            {vendorType
              ? `Check back soon for ${title}`
              : "Featured vendor guides are being updated"}
          </Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.list}
      ListHeaderComponent={
        vendorType ? (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {vendorCount > 0 ? (
              <Text style={styles.vendorCount}>
                from {vendorCount} verified companies
              </Text>
            ) : null}
          </View>
        ) : null
      }
    />
  );
}

const styles = {
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
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 16
  }
};
