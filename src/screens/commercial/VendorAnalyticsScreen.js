import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { getVendorAnalytics, getVendorOrders } from "../../api/vendorAnalytics";
import ErrorBoundary from "../../components/ErrorBoundary.js";

const normalizeList = (value) => {
  const list =
    value?.orders ||
    value?.sales ||
    value?.items ||
    value?.results ||
    value?.data ||
    value ||
    [];
  return Array.isArray(list) ? list : [];
};

const normalizeAnalytics = (value) => value?.analytics || value?.data || value || {};

function BarChart({ data, label }) {
  const rows = Array.isArray(data) ? data : [];
  const max = Math.max(...rows.map((d) => Number(d.value || 0)), 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      {rows.length ? (
        rows.map((d, i) => (
          <View key={d.id || d.label || i} style={styles.barRow}>
            <Text style={styles.barLabel}>{d.label}</Text>
            <Text style={styles.barBlock}>
              {"#".repeat(Math.max(1, Math.round((Number(d.value || 0) / max) * 20)))}
            </Text>
            <Text style={styles.barValue}>{d.value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No chart data available yet.</Text>
      )}
    </View>
  );
}

export default function VendorAnalyticsScreen() {
  const vendorId = "me";
  const [analytics, setAnalytics] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [vendorId]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        getVendorAnalytics(vendorId),
        getVendorOrders(vendorId)
      ]);
      if (!analyticsRes.success) {
        throw new Error(analyticsRes.message || "Failed to load analytics");
      }
      if (!ordersRes.success) {
        throw new Error(ordersRes.message || "Failed to load orders");
      }
      setAnalytics(normalizeAnalytics(analyticsRes.data));
      setOrders(normalizeList(ordersRes.data));
    } catch (err) {
      setAnalytics({});
      setOrders([]);
      setError(err?.message || "Failed to load vendor analytics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Vendor Analytics</Text>
        <Text style={styles.info}>View analytics and insights for your vendor account.</Text>

        {loading ? (
          <ActivityIndicator color="#0ea5e9" />
        ) : error ? (
          <View style={styles.tableContainer}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <>
            <BarChart data={analytics?.salesByMonth || []} label="Sales by Month" />
            <BarChart data={analytics?.topProducts || []} label="Top Products Sold" />

            <View style={styles.tableContainer}>
              <Text style={styles.tableHeader}>Recent Orders</Text>
              <FlatList
                data={orders}
                keyExtractor={(item, index) => String(item?._id || item?.id || index)}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>
                      {item.date || item.createdAt || item.orderDate || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {item.product || item.productName || item.title || "Order"}
                    </Text>
                    <Text style={styles.tableCell}>
                      ${Number(item.amount || item.total || 0).toFixed(2)}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No orders found</Text>}
              />
            </View>
          </>
        )}
      </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.04)",
    elevation: 1
  },
  chartLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { width: 80, fontSize: 14 },
  barBlock: { fontFamily: "monospace", color: "#0ea5e9", marginHorizontal: 4 },
  barValue: { width: 48, textAlign: "right", fontSize: 14 },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.04)",
    elevation: 1
  },
  tableHeader: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  tableCell: { width: 100, fontSize: 14 },
  emptyText: { color: "#6b7280", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
