import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function ForumCodeRoute() {
  return (
    <ScreenBoundary name="personal.forum.code">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Forum Guidelines</Text>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
          <Text style={{ opacity: 0.9 }}>
            Keep it respectful, stay on topic, and avoid doxxing or harassment.
          </Text>
          <Text style={{ opacity: 0.9 }}>
            If you share grow details, include enough context to help others respond
            (medium, light, temps, RH, feeding).
          </Text>
          <Text style={{ opacity: 0.9 }}>
            Report spam or abuse using the report action on a post.
          </Text>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}
