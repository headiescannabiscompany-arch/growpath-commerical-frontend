import { View, Text } from "react-native";
import { useFacilityDashboard } from "../hooks";

export default function FacilityDashboard() {
  const d = useFacilityDashboard();

  // Phase 2.3.5: Default aliases to eliminate TS18048 (possibly undefined)
  const plants = d?.plants ?? { total: 0, flowering: 0, veg: 0, lateFlower: 0 };
  const tasks = d?.tasks ?? { open: 0, overdue: 0, completedThisWeek: 0 };
  const inventory = d?.inventory ?? { lowStock: 0, stockoutRisk: 0 };
  const grows = d?.grows ?? { active: 0, completed: 0 };
  const team = d?.team ?? { total: 0 };

  if (d.isLoading) return <Text>Loading…</Text>;

  return (
    <View>
      <Text>Plants: {plants.total}</Text>
      <Text>Flowering: {plants.flowering}</Text>
      <Text>Veg: {plants.veg}</Text>
      <Text>Late Flower: {plants.lateFlower}</Text>

      <Text>Open Tasks: {tasks.open}</Text>
      <Text>Overdue: {tasks.overdue}</Text>
      <Text>Completed This Week: {tasks.completedThisWeek}</Text>

      <Text>Low Inventory: {inventory.lowStock}</Text>
      <Text>Stockout Risk: {inventory.stockoutRisk}</Text>

      <Text>Active Grows: {grows.active}</Text>
      <Text>Completed Grows: {grows.completed}</Text>

      <Text>Team Members: {team.total}</Text>
    </View>
  );
}
