import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INTEREST_TIERS } from "../config/interests";
import { ONBOARDING_INTERESTS_KEY } from "../constants/storageKeys";
import { ensureTier1Selection } from "../utils/growInterests";
const { height } = Dimensions.get("window");

const tier1Defaults = ensureTier1Selection([]);

export default function AppIntroScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [selectedEnv, setSelectedEnv] = useState([]);
  const scrollViewRef = useRef(null);

  // Tier data
  const cropsTier = INTEREST_TIERS.find((t) => t.id === "crops");
  const envTier = INTEREST_TIERS.find((t) => t.id === "environment");

  const toggleSelection = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  useEffect(() => {
    if (step > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [step]);

  const handleStart = () => {
    setStep(1);
  };

  const handleCropsNext = () => {
    setStep(2);
  };

  const handleFinish = async () => {
    const normalizedCrops = ensureTier1Selection(selectedCrops);
    const interests = {
      crops: normalizedCrops,
      environment: selectedEnv
    };
    try {
      await AsyncStorage.setItem(ONBOARDING_INTERESTS_KEY, JSON.stringify(interests));
    } catch (e) {
      console.log("Failed to save interests", e);
    }
    onDone();
  };

  const handleSkip = async () => {
    const defaultEnv = envTier?.options || [];
    const interests = {
      crops: tier1Defaults,
      environment: defaultEnv
    };
    try {
      await AsyncStorage.setItem(ONBOARDING_INTERESTS_KEY, JSON.stringify(interests));
    } catch (e) {
      console.log("Failed to save default interests", e);
    }
    onDone();
  };

  const renderSelectionStep = (title, subtitle, options, selected, setSelected, onNext, isLast) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.pillContainer}>
        {options.map((option) => {
          const isActive = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => toggleSelection(selected, setSelected, option)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Show button only if this is the active step (or last step) */}
      {((!isLast && step === 1) || (isLast && step === 2)) && (
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.buttonText}>{isLast ? "Finish" : "Next"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Step 0: Philosophy */}
        <View style={styles.introSection}>
          <Text style={styles.headline}>Grow with intention.</Text>
          <Text style={styles.body}>
            GrowPath is designed to help you observe, plan, and learn from your grow — not
            to automate it.{"\n\n"}
            You stay in control. The app helps you think clearly.
          </Text>
          <Text style={styles.footer}>Built by growers. Used with judgment.</Text>

          <View style={styles.startBlock}>
            <Text style={styles.getStartedLabel}>Get started</Text>
            <TouchableOpacity
              style={[styles.button, step > 0 && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={step > 0}
            >
              <Text style={styles.buttonText}>Select Interests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 1: Crops */}
        {step >= 1 &&
          renderSelectionStep(
            "What do you grow?",
            "Select all that apply. This helps us tailor your feed.",
            cropsTier?.options || [],
            selectedCrops,
            setSelectedCrops,
            handleCropsNext,
            false
          )}

        {/* Step 2: Environment */}
        {step >= 2 &&
          renderSelectionStep(
            "Where do you grow?",
            "Your environment shapes the advice you need.",
            envTier?.options || [],
            selectedEnv,
            setSelectedEnv,
            handleFinish,
            true
          )}
          
        {/* Padding for scroll */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  scrollContent: {
    padding: 32
  },
  introSection: {
    marginBottom: 40,
    alignItems: "center"
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 24,
    textAlign: "center"
  },
  body: {
    fontSize: 18,
    color: "#222",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 26
  },
  footer: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 40
  },
  startBlock: {
    alignItems: "center",
    width: "100%"
  },
  getStartedLabel: {
    fontSize: 24,
    color: "#10B981",
    marginBottom: 16,
    textAlign: "center"
  },
  button: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center"
  },
  buttonDisabled: {
    backgroundColor: "#ccc"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18
  },
  skipButton: {
    marginTop: 16,
    padding: 8
  },
  skipText: {
    fontSize: 16,
    color: "#888",
    textDecorationLine: "underline"
  },
  sectionContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    minHeight: height * 0.6, // Take up significant screen space
    justifyContent: "center"
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center"
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center"
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9"
  },
  pillActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  pillText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500"
  },
  pillTextActive: {
    color: "#fff",
    fontWeight: "700"
  },
  nextButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 10
  }
});
