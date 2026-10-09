// Local-only synthetic acceptance fixture. Not an app route or published demo.
import React from "react";
import { AppRegistry, Text, View } from "react-native";
import GrowTimelineFlow from "../../src/components/grows/GrowTimelineFlow";

const events = Array.from({ length: 100 }, (_, index) => ({
  id: `synthetic-${index + 1}`,
  title: `Synthetic milestone ${index + 1}`,
  timestamp: new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString(),
  summary: `Synthetic detail ${index + 1}. This record exists only in this local test; it is not a customer grow.`,
  highlights: [`Sample point ${index + 1}`]
})).reverse();

function Fixture() {
  return (
    <View style={{ padding: 12, maxWidth: 1000, width: "100%", alignSelf: "center" }}>
      <Text accessibilityRole="header">Local QA — 100 synthetic milestones</Text>
      <Text>No accounts, API reads, saved records, uploads or publication.</Text>
      <GrowTimelineFlow events={events} />
    </View>
  );
}

AppRegistry.registerComponent("TimelineLongStoryQA", () => Fixture);
AppRegistry.runApplication("TimelineLongStoryQA", {
  rootTag: document.getElementById("root")
});
