import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { createGrow, listGrows } from "../api/grows";

export default function GrowLogsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [grows, setGrows] = useState([]);
  const [newName, setNewName] = useState("");
  const [strain, setStrain] = useState("");
  const [stage, setStage] = useState("");

  async function loadGrows() {
    try {
      setLoading(true);
      const data = await listGrows();
      setGrows(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrows();
  }, []);

  async function handleAddGrow() {
    if (!newName.trim()) return Alert.alert("Missing name");

    try {
      const grow = await createGrow(newName, strain, stage);
      setGrows([grow, ...grows]);
      setNewName("");
      setStrain("");
      setStage("");
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  function openGrow(grow) {
    navigation.navigate("GrowJournal", { grow });
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Your Plants</Text>

      {/* Add new grow */}
      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.label}>Start a New Grow</Text>

        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Grow Name"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <TextInput
          value={strain}
          onChangeText={setStrain}
          placeholder="Strain (optional)"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <TextInput
          value={stage}
          onChangeText={setStage}
          placeholder="Stage (e.g., Veg Day 10)"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <PrimaryButton title="Create Grow" onPress={handleAddGrow} />
      </Card>

      <Text style={styles.label}>Your Grows</Text>

      <FlatList
        data={grows}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openGrow(item)}>
            <Card style={{ marginBottom: spacing(4) }}>
              <Text style={styles.growName}>{item.name}</Text>
              <Text style={styles.sub}>{item.strain}</Text>
              <Text style={styles.sub}>{item.stage}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(2),
    color: colors.text
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(3),
    color: colors.text
  },
  growName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(1),
    color: colors.text
  },
  sub: {
    color: colors.textSoft,
    marginBottom: spacing(1)
  }
});
