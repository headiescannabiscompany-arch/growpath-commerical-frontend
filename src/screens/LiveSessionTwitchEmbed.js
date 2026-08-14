import React from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { WebView } from "react-native-webview";

function getTwitchParentHost() {
  const configured = process.env.EXPO_PUBLIC_TWITCH_PARENT_HOST;
  if (configured)
    return String(configured)
      .replace(/^https?:\/\//, "")
      .split("/")[0];
  return process.env.NODE_ENV !== "production" ? "localhost" : "";
}

export default function LiveSessionTwitchEmbed({
  twitchChannel,
  embedType = "live",
  chatEnabled = false
}) {
  if (!twitchChannel) return null;
  const parentHost = getTwitchParentHost();

  if (!parentHost) {
    return (
      <View style={[styles.container, styles.unconfigured]}>
        <Text style={styles.unconfiguredText}>
          Twitch embed host is not configured for this build.
        </Text>
      </View>
    );
  }

  const parent = encodeURIComponent(parentHost);
  const channel = encodeURIComponent(String(twitchChannel));

  // For VOD, you would use video={vodId} instead
  const playerUrl =
    embedType === "vod"
      ? `https://player.twitch.tv/?video=${channel}&parent=${parent}&autoplay=false`
      : `https://player.twitch.tv/?channel=${channel}&parent=${parent}&autoplay=false`;
  const chatUrl = `https://www.twitch.tv/embed/${channel}/chat?parent=${parent}`;

  return (
    <View style={styles.container}>
      <Text accessibilityLiveRegion="polite" style={styles.playerHelp}>
        Use the player for play, pause, volume, mute, and fullscreen.
        {embedType === "vod" ? " Replays also support seeking." : ""}
      </Text>
      <WebView
        accessibilityLabel={
          embedType === "vod" ? "Twitch replay player" : "Twitch live player"
        }
        source={{ uri: playerUrl }}
        style={styles.webview}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
      />
      {chatEnabled && (
        <WebView
          source={{ uri: chatUrl }}
          style={styles.chat}
          javaScriptEnabled
          domStorageEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 500,
    width: "100%",
    backgroundColor: "#000"
  },
  webview: {
    flex: 2,
    minHeight: 300,
    width: Dimensions.get("window").width - 32,
    alignSelf: "center"
  },
  chat: {
    flex: 1,
    minHeight: 200,
    width: Dimensions.get("window").width - 32,
    alignSelf: "center"
  },
  unconfigured: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  unconfiguredText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center"
  },
  playerHelp: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "center"
  }
});
