import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10
  },
  txt: { fontWeight: "800" }
});

export default function BackButton({ label = "← Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <Pressable style={styles.btn} onPress={() => router.back()}>
      <Text style={styles.txt}>{label}</Text>
    </Pressable>
  );
}
