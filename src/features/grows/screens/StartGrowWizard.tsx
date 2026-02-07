import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { useRooms } from "../../rooms/hooks";
import { useCreateGrow } from "../hooks";
import { useNavigation } from "@react-navigation/native";

export default function StartGrowWizard() {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const { data: rooms } = useRooms();
  const createGrow = useCreateGrow();
  const navigation = useNavigation();

  const toggleRoom = (id: string) => {
    setSelectedRooms((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleStart = async () => {
    const grow = await createGrow.mutateAsync({ name, startDate, rooms: selectedRooms });
    (navigation as any).navigate("AssignPlantsToGrow", { growId: grow.id });
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Start New Grow</Text>
      <TextInput
        placeholder="Grow Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />
      <TextInput
        placeholder="Start Date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />
      <Text style={{ marginTop: 12 }}>Select Rooms:</Text>
      {rooms?.map((room: any) => (
        <Button
          key={room.id}
          title={room.name + (selectedRooms.includes(room.id) ? " ✓" : "")}
          onPress={() => toggleRoom(room.id)}
        />
      ))}
      <Button
        title="Start Grow"
        onPress={handleStart}
        disabled={!name || !startDate || selectedRooms.length === 0}
      />
    </View>
  );
}
