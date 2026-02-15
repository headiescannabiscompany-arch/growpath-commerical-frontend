import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export type EducationPostCardProps = {
  cta?: string;
  title?: string;
  body?: string;
  onPress?: () => void;
};

export default function EducationPostCard({
  title,
  body,
  onPress
}: EducationPostCardProps) {
  const Content = (
    <View style={styles.card}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!body && <Text style={styles.body}>{body}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "rgba(0,0,0,0.15)"
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  body: { opacity: 0.8 }
});
