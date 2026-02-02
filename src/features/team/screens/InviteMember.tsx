import { useState } from "react";
import { View, TextInput, Button } from "react-native";
import { useInviteMember } from "../hooks";

export default function InviteMember({ navigation }) {
  const invite = useInviteMember();
  const [email, setEmail] = useState("");

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <Button
        title="Invite"
        onPress={() =>
          invite.mutate(
            { email, role: "STAFF" },
            { onSuccess: () => navigation.goBack() }
          )
        }
      />
    </View>
  );
}
