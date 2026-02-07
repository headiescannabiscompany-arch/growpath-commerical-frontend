import { View, Text, Button } from "react-native";
import { usePlants } from "../hooks";
import { useEntitlements } from "../../../entitlements";
import UpgradePrompt from "../../UpgradePrompt";

export default function PlantsList({ navigation }: any) {
  const { can } = useEntitlements();
  if (!can.plants) return <UpgradePrompt feature="Plants" />;
  const { data, isLoading, error } = usePlants();
  if (isLoading) return <Text>Loading…</Text>;
  if (error) return <Text>Error loading plants</Text>;
  return (
    <View>
      {data
        ?.filter((p) => !p.deletedAt && !p.archivedAt)
        .map((p) => (
          <View key={p.id}>
            <Text>{p.name}</Text>
            <Button
              title="Open"
              onPress={() => navigation.navigate("Plant", { id: p.id })}
            />
          </View>
        ))}
    </View>
  );
}
