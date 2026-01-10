import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import PrimaryButton from "../components/PrimaryButton.js";

const slides = [
  {
    title: "GrowPath Commercial",
    body: "The all-in-one platform for cannabis industry businesses. From cultivators to nutrient companies to equipment manufacturers.",
    emoji: "🚀"
  },
  {
    title: "For Cultivators",
    body: "Metrc compliance tracking, multi-facility management, real-time inventory sync, and automated compliance monitoring.",
    emoji: "🌿"
  },
  {
    title: "For Industry Partners",
    body: "Soil suppliers, nutrient companies, equipment manufacturers - build credibility with grow logs, courses, and direct customer engagement.",
    emoji: "🤝"
  },
  {
    title: "Freemium Model",
    body: "Cultivators get core features free. Industry partners pay $50/month for ads, courses, content showcase, and audience reach.",
    emoji: "💳"
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
