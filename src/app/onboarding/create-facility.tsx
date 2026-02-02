import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { useCreateFacility } from "../../hooks/useCreateFacility";
import { useRouter } from "expo-router";

export default function CreateFacilityScreen() {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const createFacility = useCreateFacility();
  const router = useRouter();

  const handleCreate = async () => {
    setTouched(true);
    if (!name.trim()) return;
    createFacility.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          router.replace("/onboarding/first-setup");
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your First Facility</Text>
      <TextInput
        style={styles.input}
        placeholder="Facility Name"
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        autoFocus
      />
      {touched && !name.trim() && (
        <Text style={styles.error}>Facility name is required.</Text>
      )}
      {createFacility.isError && (
        <Text style={styles.error}>
          {createFacility.error?.message || "Failed to create facility."}
        </Text>
      )}
      <Button
        title={createFacility.isLoading ? "Creating..." : "Create Facility"}
        onPress={handleCreate}
        disabled={!name.trim() || createFacility.isLoading}
      />
      {createFacility.isLoading && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24
  },
  input: {
    width: 260,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12
  },
  error: {
    color: "#c00",
    marginBottom: 8
  }
});
