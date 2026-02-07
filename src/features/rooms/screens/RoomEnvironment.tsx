import React from "react";
import { View, Text } from "react-native";
import { useRoom } from "../hooks";

export default function RoomEnvironment({ roomId }: { roomId: string }) {
  const { data: room, isLoading } = useRoom(roomId);

  if (isLoading) return <Text>Loading…</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>Lights</Text>
      {room.lights?.length ? (
        room.lights.map((light: any) => (
          <Text key={light.id}>
            {light.name} ({light.type})
          </Text>
        ))
      ) : (
        <Text>No lights configured.</Text>
      )}
      {/* Future: show temp/humidity, automation, etc. */}
    </View>
  );
}
