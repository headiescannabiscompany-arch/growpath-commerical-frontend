import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { getEntries } from "../api/growlog";

export default function GrowLogCalendarScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getEntries();
    setEntries(res.data);
  }

  // Helper: returns "YYYY-MM-DD"
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  // All entries indexed by date
  const entriesByDate = {};
  entries.forEach((e) => {
    const d = new Date(e.date);
    const key = formatDate(d);

    if (!entriesByDate[key]) entriesByDate[key] = [];
    entriesByDate[key].push(e);
  });

  // Calendar generation
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const datesArray = [];
  for (let i = 0; i < firstDay; i++) {
    datesArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    datesArray.push(d);
  }

  function moveMonth(direction) {
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
  }

  // Determine stage color for a day
  function getStageColor(entries) {
    if (!entries || entries.length === 0) return "#eee";

    const stage = entries[0].stage;

    switch (stage) {
      case "seedling":
        return "#a3e4d7";
      case "veg":
        return "#2ecc71";
      case "flower":
        return "#af7ac5";
      default:
        return "#eee";
    }
  }

  // Entries for the selected date
  const selectedKey = selectedDate
    ? formatDate(new Date(year, month, selectedDate))
    : null;

  const selectedEntries = selectedKey ? entriesByDate[selectedKey] : [];

  return (
    <ScreenContainer scroll>
      {/* MONTH HEADER */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => moveMonth(-1)}>
          <Text style={styles.monthNav}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
          })}
        </Text>

        <TouchableOpacity onPress={() => moveMonth(1)}>
          <Text style={styles.monthNav}>›</Text>
        </TouchableOpacity>
      </View>

      {/* DAYS OF WEEK */}
      <View style={styles.weekRow}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* CALENDAR GRID */}
      <View style={styles.grid}>
        {datesArray.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.cell} />;

          const key = formatDate(new Date(year, month, day));
          const hasEntries = entriesByDate[key];

          const color = hasEntries ? getStageColor(hasEntries) : "#eaeaea";

          const isSelected = selectedDate === day;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                {
                  backgroundColor: color,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: "#2ecc71"
                }
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={styles.dayNum}>{day}</Text>

              {hasEntries && (
                <View style={styles.dot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SELECTED DAY DATA */}
      {selectedEntries && selectedEntries.length > 0 && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedTitle}>
            Entries on {selectedKey}
          </Text>

          {selectedEntries.map((e) => (
            <TouchableOpacity
              key={e._id}
              style={styles.entryItem}
              onPress={() =>
                navigation.navigate("GrowLogDetail", { id: e._id })
              }
            >
              <Text style={styles.entryTitle}>
                {e.title || "Untitled Entry"}
              </Text>
              <Text style={styles.entryNotes} numberOfLines={1}>
                {e.notes}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              navigation.navigate("GrowLogEntry", {
                date: selectedKey
              })
            }
          >
            <Text style={styles.addButtonText}>+ Add Entry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  monthNav: {
    fontSize: 26,
    paddingHorizontal: 10
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  weekLabel: {
    width: "14.28%",
    textAlign: "center",
    color: "#666"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  dayNum: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333"
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: "white",
    borderRadius: 3,
    marginTop: 2
  },
  selectedBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 10
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },
  entryItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  entryNotes: {
    color: "#666"
  },
  addButton: {
    marginTop: 12,
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  }
});
