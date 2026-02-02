import { useState } from "react";
import { View, TextInput, Button } from "react-native";
import { usePlant, useUpdatePlant } from "../hooks";

export default function PlantEdit({ route, navigation }) {
  const { id } = route.params;
  const { data } = usePlant(id);
  const update = useUpdatePlant(id);

  const [name, setName] = useState(data?.name || "");

  if (!data) return null;

  return (
    <View>
      <TextInput value={name} onChangeText={setName} />
      <Button
        title="Save"
        onPress={() => update.mutate({ name }, { onSuccess: () => navigation.goBack() })}
      />
    </View>
  );
}
