import { View, Text, Button } from "react-native";
import { useInventory } from "../hooks";
import { useEntitlements } from "../../../entitlementsProvider";
import UpgradePrompt from "../../UpgradePrompt";

export default function InventoryList({ navigation }) {
  const { can } = useEntitlements();
  if (!can.inventory) return <UpgradePrompt feature="Inventory" />;
  const { data, isLoading } = useInventory();
  if (isLoading) return <Text>Loading…</Text>;
  return (
    <View>
      {data
        ?.filter((i) => !i.deletedAt)
        .map((i) => (
          <View key={i.id}>
            <Text>
              {i.name} ({i.quantity})
            </Text>
            <Button
              title="Open"
              onPress={() => navigation.navigate("InventoryItem", { id: i.id })}
            />
          </View>
        ))}
    </View>
  );
}
