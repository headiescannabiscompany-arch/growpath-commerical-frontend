import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { apiRequest } from "../api/apiRequest";
import apiRoutes from "../api/routes";

export default function AnswerQuestionScreen({ route, navigation }) {
  const courseId = route?.params?.courseId;
  const questionId = route?.params?.questionId;
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit() {
    if (!courseId || !questionId) {
      setFeedback("Course and question context are required.");
      return;
    }
    if (!answer.trim()) {
      setFeedback("Enter an answer before submitting.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      await apiRequest(apiRoutes.COURSES.QUESTION_ANSWER(courseId, questionId), {
        method: "POST",
        body: { answer: answer.trim(), text: answer.trim() }
      });
      setFeedback("Answer submitted.");
      navigation?.goBack?.();
    } catch (error) {
      setFeedback(error?.message || "Unable to submit answer.");
    } finally {
      setSaving(false);
    }
  }

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
      {feedback ? <Text style={{ marginVertical: 8 }}>{feedback}</Text> : null}
      <Button
        title={saving ? "Submitting..." : "Submit"}
        onPress={submit}
        disabled={saving}
      />
    </View>
  );
}
