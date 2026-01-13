import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList
} from "react-native";
import { getVendorAnalytics, getVendorOrders } from "../../api/vendorAnalytics";
// Placeholder for chart: use a simple bar chart with unicode blocks
function BarChart({ data, label }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      {data.map((d, i) => (
        <View key={i} style={styles.barRow}>
          <Text style={styles.barLabel}>{d.label}</Text>
          <Text style={styles.barBlock}>
            {"█".repeat(Math.round((d.value / max) * 20))}
          </Text>
          <Text style={styles.barValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function VendorAnalyticsScreen() {
  // In a real app, vendorId would come from auth/user context
  const vendorId = "demo-vendor-1";
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [vendorId]);

  const loadData = async () => {
    setLoading(true);
    // Placeholder: use static data for now
    // const res = await getVendorAnalytics(vendorId);
    // const ord = await getVendorOrders(vendorId);
    // if (res.success) setAnalytics(res.data);
    // if (ord.success) setOrders(ord.data);
    setAnalytics({
      salesByMonth: [
        { label: "Jan", value: 12 },
        { label: "Feb", value: 18 },
        { label: "Mar", value: 9 },
        { label: "Apr", value: 15 }
      ],
      topProducts: [
        { label: "Grow Light", value: 22 },
        { label: "Nutrient A", value: 17 },
        { label: "Fan", value: 10 }
      ]
    });
    setOrders([
      { id: 1, date: "2026-01-01", product: "Grow Light", amount: 1200 },
      { id: 2, date: "2026-01-03", product: "Nutrient A", amount: 300 }
    ]);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Vendor Analytics</Text>
      <Text style={styles.info}>
        View analytics and insights for your vendor account.
      </Text>

      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <>
          <BarChart data={analytics.salesByMonth} label="Sales by Month" />
          <BarChart data={analytics.topProducts} label="Top Products Sold" />

          <View style={styles.tableContainer}>
            <Text style={styles.tableHeader}>Recent Orders</Text>
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.date}</Text>
                  <Text style={styles.tableCell}>{item.product}</Text>
                  <Text style={styles.tableCell}>${item.amount}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No orders found</Text>}
            />
          </View>
        </>
      )}
    </ScrollView>
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
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
  },
  chartLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { width: 60, fontSize: 14 },
  barBlock: { fontFamily: "monospace", color: "#0ea5e9", marginHorizontal: 4 },
  barValue: { width: 32, textAlign: "right", fontSize: 14 },
  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
  },
  tableHeader: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  tableCell: { width: 90, fontSize: 14 },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
