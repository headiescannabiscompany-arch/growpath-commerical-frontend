import React from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function GrowPathHostedLivePlayer({ playerUrl }: { playerUrl: string }) {
  if (!playerUrl) return null;

  const player =
    Platform.OS === "web"
      ? React.createElement("iframe" as any, {
          src: playerUrl,
          title: "GrowPath live video player",
          allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
          allowFullScreen: true,
          referrerPolicy: "strict-origin-when-cross-origin",
          style: {
            width: "100%",
            minHeight: 340,
            border: 0,
            backgroundColor: "#000"
          }
        })
      : (
          <WebView
            accessibilityLabel="GrowPath live video player"
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction
            source={{ uri: playerUrl }}
            style={styles.player}
          />
        );

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Use the player for play, pause, volume, mute, fullscreen, captions, and replay
        seeking when available.
      </Text>
      {player}
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
