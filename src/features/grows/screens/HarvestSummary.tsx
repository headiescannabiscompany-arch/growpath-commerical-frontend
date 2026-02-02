import React from "react";
import { View, Text } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useGrow } from "../hooks";
import { usePlants } from "../../plants/hooks";

export default function HarvestSummary() {
  const route = useRoute();
  const { id } = route.params;
  const { data: grow } = useGrow(id);
  const { data: plants } = usePlants();
  const growPlants = plants?.filter((p) => p.growId === id) || [];

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Harvest Summary</Text>
      <Text>Grow: {grow?.name}</Text>
      <Text>Start: {grow?.startDate}</Text>
      <Text>End: {grow?.endDate}</Text>
      <Text>Yield: {grow?.yield}</Text>
      <Text>Notes: {grow?.notes}</Text>
      <Text style={{ marginTop: 12, fontWeight: "bold" }}>Plants in this Grow:</Text>
      {growPlants.map((plant) => (
        <Text key={plant.id}>
          {plant.name} ({plant.stage})
        </Text>
      ))}
    </View>
  );
}
