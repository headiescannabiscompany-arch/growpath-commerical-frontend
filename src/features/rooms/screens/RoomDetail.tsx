import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import PlantsTab from "./RoomPlants";
import EnvironmentTab from "./RoomEnvironment";

export default function RoomDetail({ route }: any) {
  const [tab, setTab] = useState("plants");
  const { id } = route.params;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flexDirection: "row", justifyContent: "center", marginVertical: 12 }}
      >
        <Button title="Plants" onPress={() => setTab("plants")} />
        <Button title="Environment" onPress={() => setTab("environment")} />
      </View>
      {tab === "plants" ? <PlantsTab roomId={id} /> : <EnvironmentTab roomId={id} />}
    </View>
  );
}
