import { View, Text, Button } from "react-native";
import { useInventoryItem, useDeleteInventoryItem } from "../hooks";

export default function InventoryDetail({ route, navigation }: any) {
  const { id } = route.params;
  const { data } = useInventoryItem(id);
  const del = useDeleteInventoryItem(id);

  if (!data) return null;

  return (
    <View>
      <Text>{data.name}</Text>
      <Text>{data.quantity}</Text>

      <Button title="Edit" onPress={() => navigation.navigate("InventoryEdit", { id })} />
      <Button title="Delete" onPress={() => del.mutate()} />
    </View>
  );
}
