import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import { usePlants, useUpdatePlant } from "../../plants/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function AssignPlantsToGrow() {
  const router = useRouter();
  const params = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = Array.isArray(params.growId)
    ? params.growId[0] || ""
    : params.growId || "";
  const { data: plants } = usePlants();
  const updatePlant = useUpdatePlant();
  const [selected, setSelected] = useState<string[]>([]);

  const available = Array.isArray(plants) ? plants.filter((p) => !p.growId) : [];

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    await Promise.all(selected.map((id) => updatePlant.mutateAsync({ id, growId })));
    goToGrow();
  };

  const goToGrow = () => {
    if (!growId) {
      router.replace("/home/facility/grows");
      return;
    }
    router.replace({
      pathname: "/home/facility/grows/[id]",
      params: { id: growId }
    });
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Assign Plants to Grow</Text>
      {available.length === 0 ? (
        <Text style={{ marginVertical: 12 }}>
          No unassigned plants yet. You can add plants from the facility workspace.
        </Text>
      ) : null}
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
      <Button title="Continue to Grow" onPress={goToGrow} />
    </View>
  );
}
