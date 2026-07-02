import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type Section = {
  title: string;
  body: string;
};

type PublicInfoPageProps = {
  title: string;
  updated?: string;
  intro: string;
  sections: Section[];
};

export default function PublicInfoPage({
  title,
  updated,
  intro,
  sections
}: PublicInfoPageProps) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brand}>GrowPath</Text>
        <Text style={styles.title}>{title}</Text>
        {updated ? <Text style={styles.updated}>Last updated: {updated}</Text> : null}
        <Text style={styles.intro}>{intro}</Text>
      </View>

      <View style={styles.sections}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  content: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  header: {
    marginBottom: 28
  },
  brand: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },
  title: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10
  },
  updated: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 18
  },
  intro: {
    color: "#334155",
    fontSize: 17,
    lineHeight: 26
  },
  sections: {
    gap: 22
  },
  section: {
    borderTopColor: "#dbe3ea",
    borderTopWidth: 1,
    paddingTop: 20
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8
  },
  body: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 25
  }
});
