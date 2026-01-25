import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";
// TODO: Create this hook if missing
import { useNotifications } from "../../src/hooks/useNotifications";

export default function AppTabsLayout() {
  const { user } = useAuth();
  const { items } = useNotifications();

  const unreadCount = useMemo(() => {
    return (items || []).reduce((acc, n) => acc + (n?.read ? 0 : 1), 0);
  }, [items]);

  const badge = user ? (unreadCount > 0 ? unreadCount : undefined) : undefined;

  return (
    <Tabs>
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed"
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: badge,
          tabBarBadgeStyle: { minWidth: 18 }
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: "Interests"
        }}
      />
    </Tabs>
  );
}
