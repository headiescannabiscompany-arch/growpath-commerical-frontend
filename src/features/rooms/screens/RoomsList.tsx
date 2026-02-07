import React from "react";
import { View, Text, Button, FlatList } from "react-native";
import { useRooms } from "../hooks";
import { useNavigation } from "@react-navigation/native";

export default function RoomsList() {
  const { data: rooms, isLoading } = useRooms();
  const navigation = useNavigation();

  if (isLoading) return <Text>Loading…</Text>;

  return (
    <FlatList
      data={rooms}
      keyExtractor={(room) => room.id}
      renderItem={({ item: room }) => (
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: "#eee" }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>{room.name}</Text>
          <Text>
            {room.plantCount} plants • {room.lightCount} lights
          </Text>
          <Button
            title="View Room"
            onPress={() => (navigation as any).navigate("RoomDetail", { id: room.id })}
          />
        </View>
      )}
    />
  );
}
