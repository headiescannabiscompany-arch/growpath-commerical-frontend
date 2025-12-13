import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { getEntries } from "../api/growlog";
import { colors, spacing, radius } from "../theme/theme";

export default function GrowLogTimelineScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await getEntries();
      setEntries(res);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("GrowLogDetail", { id: item._id })}
        activeOpacity={0.7}
      >
        {item.photos?.length > 0 && (
          <Image source={{ uri: item.photos[0] }} style={styles.photo} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title || "Untitled Entry"}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>

          {item.stage && <Text style={styles.stage}>Stage: {item.stage}</Text>}

          {item.tags?.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 2).map((tag, i) => (
                <Text key={i} style={styles.tag}>
                  {tag}
                </Text>
              ))}
              {item.tags.length > 2 && (
                <Text style={styles.tag}>+{item.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerText}>Grow Timeline</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => navigation.navigate("GrowLogCalendar")}
            style={styles.calendarButton}
          >
            <Text style={styles.calendarButtonText}>📅 Calendar</Text>
          </TouchableOpacity>

          <PrimaryButton
            title="+ Add Entry"
            onPress={() => navigation.navigate("GrowLogEntry")}
            style={styles.addButton}
          />
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptySubtext}>Start logging your grow journey</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(5),
    paddingHorizontal: spacing(2)
  },
  headerText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text
  },
  headerButtons: {
    flexDirection: "row",
    gap: spacing(2)
  },
  calendarButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  calendarButtonText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14
  },
  addButton: {
    minWidth: 120
  },
  addButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2)
  },
  card: {
    flexDirection: "row",
    marginBottom: spacing(3),
    marginHorizontal: spacing(2),
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: spacing(3),
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: radius.card,
    marginRight: spacing(3)
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing(1)
  },
  date: {
    fontSize: 14,
    color: colors.textSoft,
    marginBottom: spacing(1)
  },
  stage: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
    marginBottom: spacing(1)
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing(1)
  },
  tag: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    marginRight: spacing(1),
    marginTop: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: "500"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing(2)
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSoft
  }
});
