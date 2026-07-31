import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type TabIconProps = {
  color: string;
  size: number;
};

export function makeTabBarIcon(name: IconName) {
  const TabBarIcon = ({ color, size }: TabIconProps) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  );

  TabBarIcon.displayName = `TabBarIcon(${String(name)})`;

  return TabBarIcon;
}

export function resolveTabLabel(
  fullLabel: string,
  compactLabel: string | undefined,
  compact: boolean
) {
  if (compact && compactLabel) return compactLabel;
  return fullLabel;
}
