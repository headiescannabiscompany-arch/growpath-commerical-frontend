import React from "react";
import { View, Text, Button } from "react-native";
import { usePlants } from "../../plants/hooks";
import { useNavigation } from "@react-navigation/native";

export default function RoomPlants({ roomId }: { roomId: string }) {
  const { data: plants, isLoading } = usePlants();
  const navigation = useNavigation();

  if (isLoading) return <Text>Loading…</Text>;

  const filtered = plants?.filter((p) => p.roomId === roomId) || [];

  return (
    <View>
      {filtered.length === 0 && <Text>No plants in this room.</Text>}
      {filtered.map((plant) => (
        <View key={plant.id} style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "bold" }}>{plant.name}</Text>
          <Text>Stage: {plant.stage}</Text>
          <Button
            title="Move Plant"
            onPress={() => (navigation as any).navigate("MovePlant", { id: plant.id })}
          />
        </View>
      ))}
    </View>
  );
}
