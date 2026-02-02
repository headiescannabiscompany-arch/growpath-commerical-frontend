import { View, Text } from "react-native";
import { useFacilityDashboard } from "../hooks";
import { useTeam } from "../../team/hooks";

export default function OperationsDashboard() {
  const d = useFacilityDashboard();
  const team = useTeam();
  const me = team.data?.find((m) => m.userId === team.data?.[0]?.userId); // Replace with real user context if available
  const myRole = me?.role;

  if (d.isLoading || team.isLoading) return <Text>Loading…</Text>;
  if (!myRole || (myRole !== "MANAGER" && myRole !== "OWNER")) {
    return <Text>Access denied</Text>;
  }

  return (
    <View>
      <Text>Overdue Tasks: {d.tasks.overdue}</Text>
      <Text>Open Tasks: {d.tasks.open}</Text>
      <Text>Completed This Week: {d.tasks.completedThisWeek}</Text>
      <Text>Low Inventory Items: {d.inventory.lowStock}</Text>
      <Text>Stockout Risk: {d.inventory.stockoutRisk}</Text>
      <Text>Tasks Per Staff:</Text>
      {Object.entries(d.tasks.perStaff).map(([name, count]) => (
        <Text key={name}>
          {name}: {count}
        </Text>
      ))}
    </View>
  );
}
