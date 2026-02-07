import { View, Button } from "react-native";
import { useUpdateMember, useRemoveMember } from "../hooks";

export default function TeamMemberDetail({ route, navigation }: any) {
  const { id } = route.params;
  const update = useUpdateMember(id);
  const remove = useRemoveMember(id);

  return (
    <View>
      <Button title="Make Manager" onPress={() => update.mutate({ role: "MANAGER" })} />
      <Button title="Remove" onPress={() => remove.mutate()} />
    </View>
  );
}
