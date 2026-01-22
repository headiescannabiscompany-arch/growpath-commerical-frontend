import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function GrowLogCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const datesArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Grow Log Calendar</Text>
      <View style={styles.grid}>
        {datesArray.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.cell, selectedDate === day && styles.selectedCell]}
            onPress={() => setSelectedDate(day)}
          >
            <Text style={styles.dayNum}>{day}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedDate && (
        <View style={styles.selectedBox}>
          <Text>Selected day: {selectedDate}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: 40,
    height: 40,
    margin: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eaeaea",
    borderRadius: 8
  },
  selectedCell: {
    backgroundColor: "#2ecc71"
  },
  dayNum: { fontSize: 16 },
  selectedBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    alignItems: "center"
  }
});
