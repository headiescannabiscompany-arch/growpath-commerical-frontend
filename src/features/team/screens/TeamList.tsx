import { View, Text, Button } from "react-native";
import { useTeam } from "../hooks";
import { useEntitlements } from "../../../entitlements";
import UpgradePrompt from "../../UpgradePrompt";

export default function TeamList({ navigation }: any) {
  const { can } = useEntitlements();
  if (!can.team) return <UpgradePrompt feature="Team" />;
  const { data } = useTeam();
  return (
    <View>
      {data
        ?.filter((m) => !m.deletedAt)
        .map((m) => (
          <View key={m.id}>
            <Text>
              {m.email || m.userId} — {m.role}
            </Text>
            <Button
              title="Manage"
              onPress={() => navigation.navigate("TeamMember", { id: m.id })}
            />
          </View>
        ))}
      <Button title="Invite" onPress={() => navigation.navigate("InviteMember")} />
    </View>
  );
}
