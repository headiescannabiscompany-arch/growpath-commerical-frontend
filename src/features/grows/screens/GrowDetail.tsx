import { View, Text } from "react-native";
import { useGrow } from "../hooks";

export default function GrowDetail({ route }) {
  const { id } = route.params;
  const { data } = useGrow(id);

  if (!data) return null;

  return (
    <View>
      <Text>{data.name}</Text>
      <Text>{data.stage}</Text>
      <Text>Started: {data.startDate}</Text>
      {data.endDate && <Text>Ended: {data.endDate}</Text>}
    </View>
  );
}
