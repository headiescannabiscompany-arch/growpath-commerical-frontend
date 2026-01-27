import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";

export default function AnswerQuestionScreen() {
  const [answer, setAnswer] = useState("");

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Answer Question</Text>
      <TextInput
        multiline
        placeholder="Type your answer..."
        value={answer}
        onChangeText={setAnswer}
        style={{ borderWidth: 1, padding: 10, height: 120 }}
      />
      <Button title="Submit" onPress={() => alert("Submitted")} />
    </View>
  );
}
