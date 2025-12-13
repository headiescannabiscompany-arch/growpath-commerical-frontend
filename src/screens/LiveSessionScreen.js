import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet
} from "react-native";
import LiveSessionTwitchEmbed from "./LiveSessionTwitchEmbed";
import { client } from "../api/client";

export default function LiveSessionScreen({ route }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await client(`/api/lives/${sessionId}`);
        setSession(data);
      } catch (err) {
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (error) return <Text style={{ color: "red", padding: 16 }}>{error}</Text>;

  // Check if user is admin (assume global.user.role === 'admin')
  const isAdmin = global.user && global.user.role === "admin";

  if (!session) return <Text>No session found.</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {isAdmin && session.twitchChannel && (
        <TouchableOpacity
          style={styles.modButton}
          onPress={() =>
            Linking.openURL(
              `https://dashboard.twitch.tv/u/${session.twitchChannel}/moderation`
            )
          }
        >
          <Text style={styles.modButtonText}>Open Twitch Moderation</Text>
        </TouchableOpacity>
      )}
      <LiveSessionTwitchEmbed
        twitchChannel={session.twitchChannel}
        embedType={session.embedType}
        chatEnabled={session.chatEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modButton: {
    backgroundColor: "#9147ff",
    padding: 12,
    borderRadius: 8,
    margin: 12,
    alignItems: "center",
    zIndex: 10
  },
  modButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
