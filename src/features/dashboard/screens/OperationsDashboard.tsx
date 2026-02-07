import { View, Text } from "react-native";
import { useFacilityDashboard } from "../hooks";
import { useTeam } from "../../team/hooks";

export default function OperationsDashboard() {
  const d = useFacilityDashboard();

  // Phase 2.3.5: Default aliases to eliminate TS18048 (possibly undefined)
  const tasks = d?.tasks ?? { overdue: 0, open: 0, completedThisWeek: 0, perStaff: {} };
  const inventory = d?.inventory ?? { lowStock: 0, stockoutRisk: 0 };

  const team = useTeam();
  const me = team.data?.find((m) => m.userId === team.data?.[0]?.userId); // Replace with real user context if available
  const myRole = me?.role;

  if (d.isLoading || team.isLoading) return <Text>Loading…</Text>;
  if (!myRole || (myRole !== "MANAGER" && myRole !== "OWNER")) {
    return <Text>Access denied</Text>;
  }

  return (
    <View>
      <Text>Overdue Tasks: {tasks.overdue}</Text>
      <Text>Open Tasks: {tasks.open}</Text>
      <Text>Completed This Week: {tasks.completedThisWeek}</Text>
      <Text>Low Inventory Items: {inventory.lowStock}</Text>
      <Text>Stockout Risk: {inventory.stockoutRisk}</Text>
      <Text>Tasks Per Staff:</Text>
      {Object.entries(tasks.perStaff).map(([name, count]) => (
        <Text key={name}>
          {name}: {count}
        </Text>
      ))}
    </View>
  );
}
