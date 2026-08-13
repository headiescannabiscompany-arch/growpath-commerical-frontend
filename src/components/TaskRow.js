import { Text, Pressable } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function TaskRow({ task, onPress }) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open task ${task.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 12,
        borderRadius: radius.card,
        backgroundColor: palette.surface,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: palette.border,
        minHeight: 44,
        boxShadow: "0px 0px 2px 0px rgba(0,0,0,0.05)",
        elevation: 1,
        opacity: pressed ? 0.7 : 1
      })}
    >
      <Text style={{ fontSize: 16, color: palette.text }}>{task.title}</Text>
      {task.plant && (
        <Text style={{ fontSize: 12, color: palette.textMuted }}>
          Plant: {task.plant.name}
        </Text>
      )}
    </Pressable>
  );
}
