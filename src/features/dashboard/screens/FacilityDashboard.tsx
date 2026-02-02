import { View, Text } from "react-native";
import { useFacilityDashboard } from "../hooks";

export default function FacilityDashboard() {
  const d = useFacilityDashboard();
  if (d.isLoading) return <Text>Loading…</Text>;

  return (
    <View>
      <Text>Plants: {d.plants.total}</Text>
      <Text>Flowering: {d.plants.flowering}</Text>
      <Text>Veg: {d.plants.veg}</Text>
      <Text>Late Flower: {d.plants.lateFlower}</Text>

      <Text>Open Tasks: {d.tasks.open}</Text>
      <Text>Overdue: {d.tasks.overdue}</Text>
      <Text>Completed This Week: {d.tasks.completedThisWeek}</Text>

      <Text>Low Inventory: {d.inventory.lowStock}</Text>
      <Text>Stockout Risk: {d.inventory.stockoutRisk}</Text>

      <Text>Active Grows: {d.grows.active}</Text>
      <Text>Completed Grows: {d.grows.completed}</Text>

      <Text>Team Members: {d.team.total}</Text>
    </View>
  );
}
