import { View, Text, Button } from "react-native";
import { usePlant, useDeletePlant } from "../hooks";

export default function PlantDetail({ route, navigation }: any) {
  const { id } = route.params;
  const { data } = usePlant(id);
  const del = useDeletePlant(id);

  if (!data) return null;

  return (
    <View>
      <Text>{data.name}</Text>
      <Text>{data.stage}</Text>

      <Button title="Edit" onPress={() => navigation.navigate("PlantEdit", { id })} />
      <Button title="Delete" onPress={() => del.mutate()} />
    </View>
  );
}
