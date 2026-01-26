import { Tabs } from "expo-router";
export default function PersonalLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows" }} />
      <Tabs.Screen name="growlog" options={{ title: "Grow Log" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="plants" options={{ title: "Plants" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
    </Tabs>
  );
}
