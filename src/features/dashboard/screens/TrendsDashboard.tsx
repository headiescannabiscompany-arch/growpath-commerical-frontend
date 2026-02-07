import { View, Text, ScrollView } from "react-native";
import { useFacilityDashboard } from "../hooks";
import { useTeam } from "../../team/hooks";
// Victory Native typings mismatch - using namespace import for Phase 2.3
import * as Victory from "victory-native";
const { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } = Victory as any;
import { useEntitlements } from "../../../entitlements";
import UpgradePrompt from "../../UpgradePrompt";

export default function TrendsDashboard() {
  const { can } = useEntitlements();
  if (!can.trends) return <UpgradePrompt feature="Trends" />;
  const d = useFacilityDashboard();

  // Phase 2.3.5: Default aliases to eliminate TS18048 (possibly undefined)
  const plants = d?.plants ?? { flowering: 0 };
  const inventory = d?.inventory ?? { lowStock: 0 };
  const grows = d?.grows ?? { yieldPerCycle: [], daysInCycle: [] };

  const team = useTeam();
  const me = team.data?.find((m) => m.userId === team.data?.[0]?.userId); // Replace with real user context if available
  const myRole = me?.role;
  if (d.isLoading || team.isLoading) return <Text>Loading…</Text>;
  if (myRole !== "OWNER") {
    return <Text>Access denied</Text>;
  }

  // Example data for charts (replace with real aggregation as needed)
  // Tasks completed per day (last 7 days)
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    return d;
  });
  const tasksCompletedPerDay = days.map((date) => {
    const label = date.toLocaleDateString();
    const count =
      (d.tasks?.perDay || []).filter?.((t: any) => {
        const completed = new Date(t.completedAt);
        return (
          completed.getFullYear() === date.getFullYear() &&
          completed.getMonth() === date.getMonth() &&
          completed.getDate() === date.getDate()
        );
      }).length || 0;
    return { x: label, y: count };
  });

  // Plants in flower over time (dummy, as no historical data)
  const plantsInFlower = days.map((date) => ({
    x: date.toLocaleDateString(),
    y: plants.flowering
  }));

  // Inventory consumption (dummy, as no historical data)
  const inventoryConsumption = days.map((date) => ({
    x: date.toLocaleDateString(),
    y: inventory.lowStock
  }));

  return (
    <ScrollView>
      <Text>Trends Dashboard (OWNER only)</Text>
      <Text>Yield Per Cycle: {grows.yieldPerCycle.join(", ")}</Text>
      <Text>Days In Cycle: {grows.daysInCycle.join(", ")}</Text>

      <Text style={{ marginTop: 16, fontWeight: "bold" }}>Tasks Completed Per Day</Text>
      <VictoryChart theme={VictoryTheme.material} domainPadding={10} height={200}>
        <VictoryAxis fixLabelOverlap tickFormat={(t: any) => t.slice(0, 5)} />
        <VictoryAxis dependentAxis />
        <VictoryLine data={tasksCompletedPerDay} />
      </VictoryChart>

      <Text style={{ marginTop: 16, fontWeight: "bold" }}>
        Plants in Flower Over Time
      </Text>
      <VictoryChart theme={VictoryTheme.material} domainPadding={10} height={200}>
        <VictoryAxis fixLabelOverlap tickFormat={(t: any) => t.slice(0, 5)} />
        <VictoryAxis dependentAxis />
        <VictoryLine data={plantsInFlower} />
      </VictoryChart>

      <Text style={{ marginTop: 16, fontWeight: "bold" }}>Inventory Consumption</Text>
      <VictoryChart theme={VictoryTheme.material} domainPadding={10} height={200}>
        <VictoryAxis fixLabelOverlap tickFormat={(t: any) => t.slice(0, 5)} />
        <VictoryAxis dependentAxis />
        <VictoryLine data={inventoryConsumption} />
      </VictoryChart>
    </ScrollView>
  );
}
