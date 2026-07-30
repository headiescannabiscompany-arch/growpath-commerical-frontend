import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import ReportBugButton from "@/components/ReportBugButton";
import { useAppTheme } from "@/theme/appTheme";

export default function ExpandableForumImage({
  uri,
  style,
  label
}: {
  uri: string;
  style: any;
  label: string;
}) {
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        style={[style, styles.fallback, { backgroundColor: palette.surfaceMuted }]}
        accessibilityLabel={`${label} unavailable`}
      >
        <Text style={[styles.fallbackText, { color: palette.textMuted }]}>
          Photo unavailable
        </Text>
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
            style={[
              styles.close,
              { backgroundColor: palette.surfaceStrong, borderColor: palette.border }
            ]}
            onPress={() => setExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel="Close expanded forum photo"
          >
            <Text style={[styles.closeText, { color: palette.text }]}>Close</Text>
          </Pressable>
          <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
          <View style={styles.reportBug}>
            <ReportBugButton location={`Expanded forum image: ${label}`} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.98)",
    padding: 16,
    paddingTop: 44
  },
  fullImage: { flex: 1, width: "100%", height: "100%" },
  close: {
    alignSelf: "flex-end",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 2
  },
  closeText: { fontWeight: "900" },
  reportBug: { position: "absolute", right: 16, bottom: 24, zIndex: 3 },
  fallback: { alignItems: "center", justifyContent: "center", padding: 12 },
  fallbackText: { fontWeight: "700" }
});
