import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { addReview } from "../api/courses";

export default function WriteReviewScreen({ route, navigation }) {
  const { courseId } = route.params;

  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  async function submit() {
    try {
      await addReview(courseId, rating, text);
      Alert.alert("Review submitted!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit review");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Write a Review</Text>

      <Text style={styles.label}>Rating</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((num) => (
          <Text
            key={num}
            style={[styles.star, rating >= num && styles.starActive]}
            onPress={() => setRating(num)}
          >
            ★
          </Text>
        ))}
      </View>

      <Text style={styles.label}>Review (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Share your thoughts…"
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Submit Review</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  label: { fontWeight: "600", marginBottom: 4 },
  starsRow: { flexDirection: "row", marginBottom: 10 },
  star: { fontSize: 32, color: "#ccc", marginRight: 6 },
  starActive: { color: "#f1c40f" },
  input: { backgroundColor: "#eee", padding: 12, borderRadius: 8, height: 140, textAlignVertical: "top" },
  btn: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 8, marginTop: 20 },
  btnText: { color: "white", fontWeight: "700", textAlign: "center", fontSize: 16 },
};