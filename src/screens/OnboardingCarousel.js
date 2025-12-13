import React, { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import PrimaryButton from "../components/PrimaryButton.js";

const slides = [
  {
    title: "What is GrowPath?",
    body: "GrowPath is your personal grow journal and learning companion. It helps you observe, plan, and reflect on your cultivation journey—without automating or controlling your process.",
    emoji: "🌱"
  },
  {
    title: "Who is it for?",
    body: "GrowPath is for home growers who value learning, curiosity, and intentional progress. Whether you’re new or experienced, you’ll find tools to help you grow with confidence.",
    emoji: "🧑‍🌾"
  },
  {
    title: "What it does NOT do",
    body: "GrowPath does not automate, optimize, or recommend actions. It never replaces your judgment or tells you what to do. You stay in control—always.",
    emoji: "🚫🤖"
  },
  {
    title: "Why it matters",
    body: "In a world of shortcuts, GrowPath helps you slow down, observe, and learn. Your journey is unique. We’re here to help you make it intentional.",
    emoji: "💡"
  }
];

export default function OnboardingCarousel({ onDone }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <View style={styles.container}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>
      <PrimaryButton
        title="Get Started"
        onPress={onDone}
        style={{ marginTop: 24 }}
        disabled={false}
      >
        {/* No children needed, but prop is required by type */}
      </PrimaryButton>
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#fff"
  },
  emojiWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32
  },
  emoji: {
    fontSize: 64
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 18,
    textAlign: "center"
  },
  body: {
    fontSize: 17,
    color: "#222",
    marginBottom: 32,
    textAlign: "center"
  },
  button: {
    marginTop: 12
  }
});
