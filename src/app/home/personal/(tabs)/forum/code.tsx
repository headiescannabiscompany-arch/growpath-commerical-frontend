import React from "react";
import { ScrollView, Text, View } from "react-native";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

export default function ForumCodeRoute() {
  return (
    <ScreenBoundary name="personal.forum.code" showBack backFallbackHref="/forum">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_forum_code"
          longContent
        />
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Forum Guidelines</Text>

        <View style={{ borderWidth: 1, borderRadius: radius.card, padding: 12, gap: 10 }}>
          <Text style={{ opacity: 0.9 }}>
            Keep it respectful, stay on topic, and avoid doxxing or harassment.
          </Text>
          <Text style={{ opacity: 0.9 }}>
            If you share grow details, include enough context to help others respond
            (medium, light, temps, RH, feeding).
          </Text>
          <PersonalFeedPlacement
            placement="middle"
            routeKey="personal_forum_code"
            longContent
          />
          <Text style={{ opacity: 0.9 }}>
            Report spam or abuse using the report action on a post.
          </Text>
        </View>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_forum_code"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}
