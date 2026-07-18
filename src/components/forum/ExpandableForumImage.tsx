import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function ExpandableForumImage({
  uri,
  style,
  label
}: {
  uri: string;
  style: any;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[style, styles.fallback]} accessibilityLabel={`${label} unavailable`}>
        <Text style={styles.fallbackText}>Photo unavailable</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel={`Expand ${label}`}
      >
        <Image
          source={{ uri }}
          style={style}
          resizeMode="cover"
          accessibilityLabel={label}
          onError={() => setFailed(true)}
        />
      </Pressable>
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.close}
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel="Close expanded forum photo"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    padding: 16,
    paddingTop: 44
  },
  fullImage: { flex: 1, width: "100%", height: "100%" },
  close: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 2
  },
  closeText: { color: "#0F172A", fontWeight: "900" },
  fallback: { alignItems: "center", justifyContent: "center", padding: 12 },
  fallbackText: { color: "#64748B", fontWeight: "700" }
});
