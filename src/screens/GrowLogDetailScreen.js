import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getEntry, deleteEntry } from "../api/growlog";
import { listGrows } from "../api/grows";

export default function GrowLogDetailScreen({ route, navigation }) {
  const entryId = route.params?.id;
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharePrefillLoading, setSharePrefillLoading] = useState(false);
  const [growTagCache, setGrowTagCache] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await getEntry(entryId);
      setEntry(res);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete Entry", "Are you sure you want to delete this grow log entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: handleDelete }
    ]);
  }

  async function handleDelete() {
    try {
      await deleteEntry(entryId);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  async function fetchGrowTagsForId(growId) {
    if (!growId) return [];
    const targetId = typeof growId === "object" ? growId._id : growId;
    if (!targetId) return [];

    if (growTagCache && Object.prototype.hasOwnProperty.call(growTagCache, targetId)) {
      return growTagCache[targetId] || [];
    }

    try {
      const grows = await listGrows();
      if (Array.isArray(grows)) {
        const nextCache = grows.reduce((acc, grow) => {
          if (grow?._id) {
            acc[grow._id] = Array.isArray(grow.growTags)
              ? grow.growTags.filter(Boolean)
              : [];
          }
          return acc;
        }, {});
        setGrowTagCache(nextCache);
        return nextCache[targetId] || [];
      }
    } catch (err) {
      console.warn("Unable to load grow tags for forum share", err);
    }
    return [];
  }

  async function deriveShareInterestTags(currentEntry) {
    if (!currentEntry) {
      return { tags: [], expand: false };
    }

    const entryTags = Array.isArray(currentEntry.growTags)
      ? currentEntry.growTags.filter(Boolean)
      : [];
    if (entryTags.length) {
      return { tags: entryTags, expand: true };
    }

    const fallback = await fetchGrowTagsForId(currentEntry.grow);
    return {
      tags: fallback,
      expand: fallback.length > 0
    };
  }

  async function handleShareToForum() {
    if (!entry || sharePrefillLoading) return;
    try {
      setSharePrefillLoading(true);
      const { tags, expand } = await deriveShareInterestTags(entry);
      navigation.navigate("ForumNewPost", {
        photos: entry.photos || [],
        content: entry.notes || "",
        strain: entry.strain || "",
        initialGrowInterests: tags,
        expandInterestPicker: expand,
        growLogId: entry._id,
        fromGrowLogId: entry._id
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Unable to prepare the forum post.");
    } finally {
      setSharePrefillLoading(false);
    }
  }

  if (!entry) {
    return (
      <ScreenContainer>
        <Text>{loading ? "Loading..." : "Entry not found."}</Text>
      </ScreenContainer>
    );
  }

  const dateLabel = entry.date ? new Date(entry.date).toLocaleString() : "";

  return (
    <ScreenContainer scroll>
      {/* Header row: Title + actions */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{entry.title || "Untitled Entry"}</Text>
          {!!dateLabel && <Text style={styles.date}>{dateLabel}</Text>}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("GrowLogEntry", { id: entry._id })}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#e74c3c20" }]}
            onPress={confirmDelete}
          >
            <Text style={[styles.actionText, { color: "#e74c3c" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photos carousel */}
      {entry.photos && entry.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {entry.photos.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.photo} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      {/* ACTION BUTTONS */}
      <View style={{ flexDirection: "row", marginTop: 20 }}>
        {/* Diagnose Button */}
        <TouchableOpacity
          style={[styles.actionLargeButton, { backgroundColor: "#3498db" }]}
          onPress={() =>
            navigation.navigate("DiagnoseScreen", {
              photos: entry.photos,
              notes: entry.notes,
              fromGrowLogId: entry._id
            })
          }
        >
          <Text style={styles.actionLargeText}>Diagnose This Entry</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", marginTop: 10 }}>
        {/* Share to Forum Button */}
        <TouchableOpacity
          style={[styles.actionLargeButton, { backgroundColor: "#9b59b6" }]}
          onPress={handleShareToForum}
          disabled={sharePrefillLoading}
        >
          <Text style={styles.actionLargeText}>
            {sharePrefillLoading ? "Preparing..." : "Share to Forum"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Strain / Stage / Week / Day */}
      <View style={styles.infoRow}>
        {entry.strain ? (
          <View style={styles.infoChip}>
            <Text style={styles.infoLabel}>Strain</Text>
            <Text style={styles.infoValue}>{entry.strain}</Text>
          </View>
        ) : null}

        {entry.stage ? (
          <View style={styles.infoChip}>
            <Text style={styles.infoLabel}>Stage</Text>
            <Text style={styles.infoValue}>{entry.stage}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoRow}>
        {entry.week != null ? (
          <View style={styles.infoChip}>
            <Text style={styles.infoLabel}>Week</Text>
            <Text style={styles.infoValue}>{entry.week}</Text>
          </View>
        ) : null}

        {entry.day != null ? (
          <View style={styles.infoChip}>
            <Text style={styles.infoLabel}>Day</Text>
            <Text style={styles.infoValue}>{entry.day}</Text>
          </View>
        ) : null}
      </View>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.tagsRow}>
            {entry.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      {entry.notes ? (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{entry.notes}</Text>
        </View>
      ) : null}

      {/* AI Insights */}
      {entry.aiInsights ? (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionLabel}>🤖 AI Insights</Text>
          <Text style={styles.aiInsights}>{entry.aiInsights}</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  date: {
    marginTop: 4,
    color: "#777"
  },
  actions: {
    flexDirection: "row",
    marginLeft: 8
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eeeeee",
    marginLeft: 6
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333"
  },
  photo: {
    width: 260,
    height: 260,
    borderRadius: 14,
    marginRight: 10
  },
  infoRow: {
    flexDirection: "row",
    marginTop: 8
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f3f3",
    marginRight: 8
  },
  infoLabel: {
    fontSize: 11,
    color: "#888"
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600"
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  tag: {
    backgroundColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  tagText: {
    fontSize: 12,
    color: "#333"
  },
  notes: {
    fontSize: 15,
    lineHeight: 21,
    color: "#333"
  },
  aiInsights: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2c3e50",
    fontStyle: "italic",
    marginTop: 4
  },
  actionLargeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  actionLargeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  }
});
