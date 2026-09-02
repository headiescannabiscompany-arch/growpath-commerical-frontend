import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function GrowPathHostedLivePlayer({ playerUrl }: { playerUrl: string }) {
  if (!playerUrl) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Use the player for play, pause, volume, mute, fullscreen, captions, and replay
        seeking when available.
      </Text>
      {React.createElement("iframe", {
        src: playerUrl,
        title: "GrowPath live video player",
        allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
        allowFullScreen: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        style: {
          width: "100%",
          minHeight: "340px",
          border: "0",
          backgroundColor: "#000"
        }
      })}
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
  }
});
