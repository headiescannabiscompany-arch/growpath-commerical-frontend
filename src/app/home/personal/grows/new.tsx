import React from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { apiRequest } from "@/api/apiRequest";

const GROWS_CREATE_PATH = "/api/grows";

export default function NewGrowScreen() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onCreate = React.useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the grow a name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiRequest(GROWS_CREATE_PATH, {
        method: "POST",
        body: { name: trimmed }
      });

      // Force the grows tab to refresh by changing the query param.
      router.replace(`/home/personal/grows?r=${Date.now()}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create grow.");
    } finally {
      setSaving(false);
    }
  }, [name, router]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>New grow</Text>
      <Text style={{ opacity: 0.7, marginTop: 4 }}>
        Create a grow so logs, plants, and tools can attach to it.
      </Text>

      {error ? (
        <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 10 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Fix this</Text>
          <Text style={{ opacity: 0.8 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Name</Text>
        <TextInput
          testID="input-grow-name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Blueberry Muffin Run 3"
          autoCapitalize="sentences"
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />
      </View>

      <TouchableOpacity
        testID="btn-save-grow"
        onPress={onCreate}
        disabled={saving}
        style={{
          marginTop: 16,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderRadius: 10,
          opacity: saving ? 0.6 : 1,
          alignSelf: "flex-start"
        }}
      >
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontWeight: "700" }}>Create grow</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function NewGrowScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <BackButton />

      <Text style={styles.title}>New Grow</Text>

      <Text style={styles.label}>Grow Name</Text>
      <TextInput placeholder="My first grow" style={styles.input} />

      <Text style={styles.label}>Start Date</Text>
      <TextInput placeholder="YYYY-MM-DD" style={styles.input} />

      <Pressable style={styles.cta} onPress={() => router.back()}>
        <Text style={styles.ctaText}>Create Grow</Text>
      </Pressable>
    </View>
  );
}
