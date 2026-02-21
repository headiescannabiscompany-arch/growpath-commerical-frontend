import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiRequest } from "../api/apiRequest";

export default function LiveSessionsListScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

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
            onPress={() => navigation.navigate("LiveSession", { sessionId: item._id })}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.meta}>Twitch: {item.twitchChannel}</Text>
            <Text style={styles.meta}>
              Start: {new Date(item.startsAt).toLocaleString()}
            </Text>
            <Text style={styles.meta}>Access: {item.accessLevel}</Text>
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
    borderRadius: 10,
    padding: 16,
    elevation: 2
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#10B981" },
  desc: { color: "#ccc", marginVertical: 4 },
  meta: { color: "#aaa", fontSize: 12 },
  published: { color: "#10B981", fontWeight: "bold", marginTop: 4 },
  unpublished: { color: "#f59e42", fontWeight: "bold", marginTop: 4 }
});
