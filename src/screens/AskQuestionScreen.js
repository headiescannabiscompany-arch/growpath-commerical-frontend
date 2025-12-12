import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { askQuestion } from "../api/questions";

export default function AskQuestionScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [text, setText] = useState("");

  async function submit() {
    if (!text.trim()) {
      return Alert.alert("Please enter a question");
    }

    try {
      await askQuestion(courseId, text);
      Alert.alert("Success", "Question posted!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to post question");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Ask a Question</Text>

      <TextInput
        style={styles.textBox}
        placeholder="Type your question…"
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Submit Question</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  textBox: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    height: 150,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  btn: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 8 },
  btnText: { textAlign: "center", color: "white", fontWeight: "700", fontSize: 16 },
});