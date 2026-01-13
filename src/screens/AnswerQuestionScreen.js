import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { answerQuestion } from "../api/questions";

export default function AnswerQuestionScreen({ route, navigation }) {
  const { courseId, questionId } = route.params;
  const [text, setText] = useState("");

  async function submit() {
    if (!text.trim()) {
      return Alert.alert("Please enter an answer");
    }

    try {
      await answerQuestion(courseId, questionId, text);
      Alert.alert("Success", "Answer posted!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to post answer");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Your Answer</Text>

      <TextInput
        style={styles.textBox}
        placeholder="Write your answer…"
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Post Answer</Text>
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
};