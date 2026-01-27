import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

function LinkButton({ title, href }: { title: string; href: string }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      style={{
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{title}</Text>
      <Text style={{ marginTop: 4, opacity: 0.6 }}>{href}</Text>
    </Pressable>
  );
}

export default function Home() {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>GrowPath AI</Text>
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        Home — choose a route to test.
      </Text>

      <View style={{ marginTop: 18 }}>
        <LinkButton title="Campaigns" href="/campaigns" />
        <LinkButton title="Courses" href="/courses" />
        <LinkButton title="Creator Dashboard" href="/creator-dashboard" />
        <LinkButton title="Certificates" href="/certificates" />
        <LinkButton title="Verify Certificate" href="/certificate-verification" />
        <LinkButton title="Comments" href="/comments" />
        <LinkButton title="Commercial Inventory" href="/commercial-inventory" />
        <LinkButton title="Debug" href="/debug" />
        <LinkButton title="Light Calculator" href="/light-calculator" />
      </View>
    </View>
  );
}
