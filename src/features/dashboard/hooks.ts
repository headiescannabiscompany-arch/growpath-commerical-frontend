import { usePlants } from "../plants/hooks";
import { useTasks } from "../tasks/hooks";
import { useInventory } from "../inventory/hooks";
import { useGrows } from "../grows/hooks";
import { useTeam } from "../team/hooks";

export function useFacilityDashboard() {
  const plants = usePlants();
  const tasks = useTasks();
  const inventory = useInventory();
  const grows = useGrows();
  const team = useTeam();

  if (
    plants.isLoading ||
    tasks.isLoading ||
    inventory.isLoading ||
    grows.isLoading ||
    team.isLoading
  ) {
    return { isLoading: true };
  }

  const plantList = plants.data || [];
  const taskList = tasks.data || [];
  const inventoryList = inventory.data || [];
  const growList = grows.data || [];
  const teamList = team.data || [];

  return {
    isLoading: false,
    plants: {
      total: plantList.length,
      flowering: plantList.filter((p) => p.stage === "Flower").length,
      veg: plantList.filter((p) => p.stage === "Veg").length,
      lateFlower: plantList.filter(
        (p) => p.stage === "LateFlower" || (p.stage === "Flower" && p.daysInStage > 21)
      ).length
    },
    tasks: {
      open: taskList.filter((t) => t.status !== "DONE").length,
      overdue: taskList.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
      ).length,
      completedThisWeek: taskList.filter((t) => {
        if (t.status !== "DONE" || !t.completedAt) return false;
        const d = new Date(t.completedAt);
        const now = new Date();
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return d >= weekAgo && d <= now;
      }).length,
      perStaff: teamList.reduce(
        (acc, member) => {
          acc[member.name] = taskList.filter((t) => t.assignedTo === member.id).length;
          return acc;
        },
        {} as Record<string, number>
      )
    },
    inventory: {
      total: inventoryList.length,
      lowStock: inventoryList.filter((i) => i.quantity < 5).length,
      stockoutRisk: inventoryList.filter((i) => i.quantity === 0).length
    },
    grows: {
      active: growList.filter((g) => !g.endDate).length,
      daysInCycle: growList
        .filter((g) => !g.endDate)
        .map((g) => {
          const start = new Date(g.startDate);
          const now = new Date();
          return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }),
      completed: growList.filter((g) => g.endDate).length,
      yieldPerCycle: growList.filter((g) => g.endDate && g.yield).map((g) => g.yield)
    },
    team: {
      total: teamList.length,
      roles: teamList.map((m) => m.role)
    }
  };
}
