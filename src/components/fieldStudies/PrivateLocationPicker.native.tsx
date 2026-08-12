import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { parsePublicCoordinates, type PublicCoordinates } from "@/utils/locationSearch";

type Props = {
  value: PublicCoordinates | null;
  onChange: (coordinates: PublicCoordinates) => void;
};

export default function PrivateLocationPicker({ value, onChange }: Props) {
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : "");
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : "");
  const [error, setError] = useState("");
  return (
    <View style={styles.container}>
      <Text>Enter coordinates only when device location is unavailable.</Text>
      <TextInput
        accessibilityLabel="Plant latitude"
        keyboardType="numbers-and-punctuation"
        onChangeText={setLatitude}
        placeholder="Latitude"
        style={styles.input}
        value={latitude}
      />
      <TextInput
        accessibilityLabel="Plant longitude"
        keyboardType="numbers-and-punctuation"
        onChangeText={setLongitude}
        placeholder="Longitude"
        style={styles.input}
        value={longitude}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const coordinates = parsePublicCoordinates(latitude, longitude);
          if (!coordinates) {
            setError("Enter a valid latitude and longitude.");
            return;
          }
          setError("");
          onChange(coordinates);
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Use These Coordinates Privately</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  input: { borderColor: "#8aa091", borderRadius: 8, borderWidth: 1, padding: 10 },
  button: { borderColor: "#176b3a", borderRadius: 8, borderWidth: 1, padding: 10 },
  buttonText: { color: "#176b3a", fontWeight: "700" }
});
