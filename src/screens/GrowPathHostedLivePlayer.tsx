import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function GrowPathHostedLivePlayer({ playerUrl }: { playerUrl: string }) {
  if (!playerUrl) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Use the player for play, pause, volume, mute, fullscreen, captions, and replay
        seeking when available.
      </Text>
      <WebView
        accessibilityLabel="GrowPath live video player"
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        source={{ uri: playerUrl }}
        style={styles.player}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#000", minHeight: 390, width: "100%" },
  help: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    textAlign: "center"
  },
  player: {
    minHeight: 340,
    width: Dimensions.get("window").width - 32,
    alignSelf: "center"
  }
});
