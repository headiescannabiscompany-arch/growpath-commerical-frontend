import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import { usePlants } from "../../plants/hooks";
import { useUpdatePlant } from "../../plants/hooks";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function AssignPlantsToGrow() {
  const route = useRoute();
  const navigation = useNavigation();
  const { growId } = route.params;
  const { data: plants } = usePlants();
  const updatePlant = useUpdatePlant();
  const [selected, setSelected] = useState<string[]>([]);

  const available = plants?.filter((p) => !p.growId) || [];

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    await Promise.all(selected.map((id) => updatePlant.mutateAsync({ id, growId })));
    navigation.navigate("GrowDetail", { id: growId });
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Assign Plants to Grow</Text>
      {available.map((plant) => (
        <Button
          key={plant.id}
          title={plant.name + (selected.includes(plant.id) ? " ✓" : "")}
          onPress={() => toggle(plant.id)}
        />
      ))}
      <Button
        title="Assign to Grow"
        onPress={handleAssign}
        disabled={selected.length === 0}
      />
    </View>
  );
}
