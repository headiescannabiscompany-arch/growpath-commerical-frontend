import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "../api/apiRequest";
import { radius } from "../theme/theme";

export default function LiveSessionsListScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSessions() {
      try {
        const data = await apiRequest("/api/lives", { method: "GET" });
        setSessions(data);
      } catch (err) {
        setError(err.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (error) return <Text style={{ color: "red", padding: 16 }}>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.sessionCard}
            onPress={() =>
              router.push(`/live-session?sessionId=${encodeURIComponent(item._id)}`)
            }
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.meta}>Twitch: {item.twitchChannel}</Text>
            <Text style={styles.meta}>
              Start: {new Date(item.startsAt).toLocaleString()}
            </Text>
            <Text style={styles.meta}>Access: {item.accessLevel}</Text>
            <Text style={styles.meta}>RSVPs: {Number(item.rsvpCount || 0)}</Text>
            {item.replayUrl ? <Text style={styles.replay}>Replay available</Text> : null}
            {item.isPublished ? (
              <Text style={styles.published}>Published</Text>
            ) : (
              <Text style={styles.unpublished}>Draft</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
            No live sessions found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    margin: 16,
    textAlign: "center"
  },
  sessionCard: {
    backgroundColor: "#222",
    margin: 12,
    borderRadius: radius.card,
    padding: 16,
    elevation: 2
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#10B981" },
  desc: { color: "#ccc", marginVertical: 4 },
  meta: { color: "#aaa", fontSize: 12 },
  published: { color: "#10B981", fontWeight: "bold", marginTop: 4 },
  unpublished: { color: "#f59e42", fontWeight: "bold", marginTop: 4 },
  replay: { color: "#93C5FD", fontWeight: "bold", marginTop: 4 }
});
