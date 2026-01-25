import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../src/auth/AuthContext";
import { updateGrowInterests } from "../../src/api/user";
import { GROW_TAXONOMY } from "../../src/constants/growTaxonomy";

export default function InterestsScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [selected, setSelected] = useState<string[]>(user?.growInterests || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(tag: string) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function save() {
    try {
      setLoading(true);
      setError(null);

      const res = await updateGrowInterests(selected);
      updateUser(res.user); // keeps AuthContext in sync
      router.back();
    } catch (err: any) {
      setError(err?.message || "Failed to save interests");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 8 }}>My Grow Interests</Text>

      <Text style={{ opacity: 0.7, marginBottom: 16 }}>
        These power your feed, recommendations, and notifications.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {GROW_TAXONOMY.map((tag) => {
          const active = selected.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggle(tag)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                margin: 6,
                backgroundColor: active ? "#000" : "transparent"
              }}
            >
              <Text style={{ color: active ? "#fff" : "#000" }}>#{tag}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={{ color: "red", marginTop: 12 }}>{error}</Text> : null}

      <Pressable
        onPress={save}
        disabled={loading}
        style={{
          marginTop: 24,
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          alignItems: "center",
          opacity: loading ? 0.5 : 1
        }}
      >
        <Text>{loading ? "Saving..." : "Save Interests"}</Text>
      </Pressable>
    </ScrollView>
  );
}
