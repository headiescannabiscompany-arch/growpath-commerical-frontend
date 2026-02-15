import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { useRooms, useBulkCreateRooms } from "../hooks";
import { useRouter } from "expo-router";

const DEFAULT_ROOMS = ["Flower Room", "Veg Room", "Mother Room"];

type ProgressState = { current: number; total: number; failed: number[] };

export default function FirstSetupRooms() {
  const [rooms, setRooms] = useState(DEFAULT_ROOMS.map((name) => ({ name, error: "" })));
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    failed: []
  });
  const [touched, setTouched] = useState(false);

  void touched;
  const { data: existingRooms } = useRooms();
  const bulkCreate = useBulkCreateRooms();
  const router = useRouter();

  // Validation helpers
  const dedupeNames = (names: string[]): string[] => {
    const seen: Record<string, boolean> = {};
    return names.map((name: string, i: number) => {
      let base = name.trim() || `Room ${i + 1}`;
      let n = 1;
      let unique = base;
      while (seen[unique]) unique = `${base} (${++n})`;
      seen[unique] = true;
      return unique;
    });
  };

  const validate = () => {
    let valid = true;
    const names = rooms.map((r) => r.name.trim());
    const deduped = dedupeNames(names);
    const newRooms = rooms.map((r, i) => {
      let error = "";
      if (!r.name.trim()) {
        error = "Room name required";
        valid = false;
      }
      if (names.indexOf(r.name.trim()) !== i) {
        error = "Duplicate name";
        valid = false;
      }
      return { ...r, name: deduped[i], error };
    });
    setRooms(newRooms);
    return valid;
  };

  const handleAddRoom = () => {
    setRooms([...rooms, { name: "", error: "" }]);
  };
  const handleRemoveRoom = (idx: number) => {
    if (rooms.length === 1) return;
    setRooms(rooms.filter((_, i) => i !== idx));
  };
  const handleNameChange = (idx: number, name: string) => {
    setRooms(rooms.map((r, i) => (i === idx ? { ...r, name, error: "" } : r)));
  };

  const handleCreateRooms = async () => {
    setTouched(true);
    if (!validate()) return;
    setCreating(true);
    setProgress({ current: 0, total: rooms.length, failed: [] });
    const results = await bulkCreate.mutateAsync(
      rooms.map((r) => ({ name: r.name.trim() }))
    );
    const failed = results
      .map((res, i) => (!res.success ? i : null))
      .filter((i) => i !== null);
    setProgress({
      current: rooms.length,
      total: rooms.length,
      failed: failed as number[]
    });
    setCreating(false);
    if (failed.length === 0) {
      router.replace("/onboarding/start-grow");
    }
  };

  const handleSkip = () => {
    router.replace("/rooms?onboarding=1");
  };

  // If rooms already exist, skip setup
  if (existingRooms && existingRooms.length > 0) {
    router.replace("/onboarding/start-grow");
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rooms are where plants and work live.</Text>
      <FlatList
        data={rooms}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.roomRow}>
            <TextInput
              style={styles.input}
              value={item.name}
              onChangeText={(text) => handleNameChange(index, text)}
              placeholder={`Room ${index + 1}`}
              editable={!creating}
            />
            <TouchableOpacity
              onPress={() => handleRemoveRoom(index)}
              disabled={rooms.length === 1 || creating}
              style={styles.removeBtn}
            >
              <Text style={{ color: rooms.length === 1 ? "#ccc" : "#c00" }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity
            onPress={handleAddRoom}
            disabled={creating}
            style={styles.addBtn}
          >
            <Text style={{ color: "#007aff", fontWeight: "bold" }}>+ Add room</Text>
          </TouchableOpacity>
        }
      />
      {rooms.some((r) => r.error) && (
        <Text style={styles.error}>{rooms.find((r) => r.error)?.error}</Text>
      )}
      {progress.failed.length > 0 && (
        <Text style={styles.error}>
          Failed to create: {progress.failed.map((i) => rooms[i].name).join(", ")}
        </Text>
      )}
      <Button
        title={
          creating ? `Creating ${progress.current}/${progress.total}...` : "Create rooms"
        }
        onPress={handleCreateRooms}
        disabled={creating || rooms.some((r) => !r.name.trim() || r.error)}
      />
      <Button
        title="Skip for now"
        onPress={handleSkip}
        color="#888"
        disabled={creating}
      />
      {creating && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16
  },
  removeBtn: {
    marginLeft: 8
  },
  addBtn: {
    marginTop: 8,
    marginBottom: 16
  },
  error: {
    color: "#c00",
    marginBottom: 8
  }
});
