import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * Safe, crash-proof forum highlight card.
 * (The previous version crashed because `styles` was referenced but never defined.)
 */
type Props = {
  title?: string;
  meta?: string;
  href?: string;
  onPress?: () => void;
  thread?: any;
  [key: string]: any;
};

export default function ForumThreadCard(props: Props) {
  const router = useRouter();

  const title = props.title ?? props.thread?.title ?? "Forum thread";
  const meta = props.meta ?? props.thread?.meta ?? props.thread?.subtitle ?? "";
  const href =
    props.href ??
    props.thread?.href ??
    props.thread?.url ??
    props.thread?.link ??
    undefined;

  const handlePress = () => {
    if (typeof props.onPress === "function") return props.onPress();
    if (href) router.push(href as any);
  };

  return (
    <Pressable onPress={handlePress} style={styles.card} accessibilityRole="button">
      <Text style={styles.label}>Forum</Text>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {!!meta && (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      )}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.link}>View thread {"\u2192"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  label: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4
  },
  meta: {
    fontSize: 13,
    opacity: 0.75
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.85
  }
});
