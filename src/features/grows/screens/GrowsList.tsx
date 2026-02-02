import { View, Text, Button } from "react-native";
import { useGrows } from "../hooks";

export default function GrowsList({ navigation }) {
  const { data, isLoading } = useGrows();

  if (isLoading) return <Text>Loading…</Text>;

  return (
    <View>
      {data
        ?.filter((g) => !g.deletedAt)
        .map((g) => (
          <View key={g.id}>
            <Text>{g.name}</Text>
            <Button
              title="Open"
              onPress={() => navigation.navigate("Grow", { id: g.id })}
            />
          </View>
        ))}
    </View>
  );
}
