import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function CalendarScreen() {
  const { capabilities } = useAuth();
  const locked = !capabilities?.personalCalendar;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.sub}>
        Coming soon — this will be your schedule + task + grow timeline view.
      </Text>
      {locked ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Locked: Your plan does not include Calendar.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Planned content</Text>
          <Text style={styles.li}>• Upcoming tasks (by due date)</Text>
          <Text style={styles.li}>• Feedings / irrigation reminders</Text>
          <Text style={styles.li}>• Stage timeline (veg/flower/harvest)</Text>
          <Text style={styles.li}>• Facility events (facility mode)</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API error placeholder (403/404)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sub: { fontSize: 14, opacity: 0.8, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  li: { fontSize: 14, marginBottom: 6 }
});
