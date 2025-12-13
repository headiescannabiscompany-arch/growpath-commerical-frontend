import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

export default function LiveSessionTwitchEmbed({
  twitchChannel,
  embedType = "live",
  chatEnabled = false
}) {
  if (!twitchChannel) return null;
  // For VOD, you would use video={vodId} instead
  const playerUrl =
    embedType === "vod"
      ? `https://player.twitch.tv/?video=${twitchChannel}&parent=localhost&autoplay=true`
      : `https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&autoplay=true`;
  const chatUrl = `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=localhost`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: playerUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
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
  }
});
