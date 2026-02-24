/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";

export default function GuildCodeScreen() {
  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>ðŸŒ± The Growers Forum</Text>

        <Text style={styles.heading}>What the Growers Forum Is</Text>
        <Text style={styles.body}>
          The Growers Forum is a community of cultivators focused on craft, learning, and
          shared experience.
        </Text>
        <Text style={styles.body}>
          This is not a chat room, social feed, or hype space.{"\n"}
          It exists to help growers think clearly, observe carefully, and improve
          deliberately.
        </Text>

        <Text style={styles.subheading}>The Forum values:</Text>
        <Text style={styles.bullet}>-  Experience over opinion</Text>
        <Text style={styles.bullet}>-  Observation over assumption</Text>
        <Text style={styles.bullet}>-  Learning over posturing</Text>

        <Text style={styles.body}>
          If you grow plants and want to grow better, you belong here.
        </Text>

        <Text style={styles.heading}>What the Growers Forum Is Not</Text>
        <Text style={styles.bullet}>-  Not social media</Text>
        <Text style={styles.bullet}>-  Not a meme board</Text>
        <Text style={styles.bullet}>-  Not a place to flex yields or setups</Text>
        <Text style={styles.bullet}>-  Not a substitute for doing the work</Text>

        <Text style={styles.body}>Posts are meant to add signal, not noise.</Text>

        <Text style={styles.heading}>ðŸ§­ How the Forum Works</Text>
        <Text style={styles.body}>The Forum is progressively unlocked.</Text>
        <Text style={styles.body}>
          You may see Forum features before you can use them.{"\n"}
          This is intentional.
        </Text>

        <Text style={styles.subheading}>Access is earned through:</Text>
        <Text style={styles.bullet}>-  Participation</Text>
        <Text style={styles.bullet}>-  Accuracy</Text>
        <Text style={styles.bullet}>-  Respect for fundamentals</Text>
        <Text style={styles.bullet}>-  Consistent engagement with your own grow</Text>

        <Text style={styles.heading}>Entry State: Observer</Text>
        <Text style={styles.body}>All new users enter the Forum as Observers.</Text>

        <Text style={styles.subheading}>Observers can:</Text>
        <Text style={styles.bullet}>-  Read discussions</Text>
        <Text style={styles.bullet}>-  Learn from past threads</Text>
        <Text style={styles.bullet}>-  See how experienced growers communicate</Text>
        <Text style={styles.bullet}>-  Understand the standards before posting</Text>

        <Text style={styles.body}>This keeps the Forum useful for everyone.</Text>

        <Text style={styles.heading}>ðŸ“œ Forum Code (Simple, Enforced)</Text>

        <View style={styles.rule}>
          <Text style={styles.ruleNumber}>1. Speak from experience</Text>
          <Text style={styles.ruleBody}>
            If you haven't done it, say so.{"\n\n"}
            Speculation should be labeled clearly as theory or hypothesis.
          </Text>
        </View>

        <View style={styles.rule}>
          <Text style={styles.ruleNumber}>2. Context matters</Text>
          <Text style={styles.ruleBody}>
            Posts should include relevant context:{"\n"}-  Stage of growth{"\n"}- 
            Environment{"\n"}-  Medium{"\n"}-  Constraints{"\n\n"}
            Advice without context is noise.
          </Text>
        </View>

        <View style={styles.rule}>
          <Text style={styles.ruleNumber}>3. Teach, don't posture</Text>
          <Text style={styles.ruleBody}>
            The goal is clarity, not dominance.{"\n\n"}
            Correct gently. Explain why, not just what.
          </Text>
        </View>

        <View style={styles.rule}>
          <Text style={styles.ruleNumber}>4. Respect the craft</Text>
          <Text style={styles.ruleBody}>
            Growing is learned over time.{"\n\n"}
            There are no shortcuts here - and no shame in being early in the process.
          </Text>
        </View>

        <View style={styles.rule}>
          <Text style={styles.ruleNumber}>5. No spam, no selling, no DMs</Text>
          <Text style={styles.ruleBody}>
            The Forum is not a marketplace.{"\n\n"}
            No promotions, solicitations, or private outreach.
          </Text>
        </View>

        <Text style={styles.heading}>ðŸ›ï¸ Forum Roles & Trust Levels</Text>
        <Text style={styles.body}>
          These are not titles for ego.{"\n"}
          They exist to protect the quality of discussion.
        </Text>

        <View style={styles.role}>
          <Text style={styles.roleTitle}>ðŸ‘ï¸ Observer</Text>
          <Text style={styles.roleDesc}>Default role</Text>
          <Text style={styles.roleDesc}>Read-only access</Text>
          <Text style={styles.roleDesc}>Can view all public Forum discussions</Text>
          <Text style={styles.roleDesc}>No posting or commenting</Text>
          <Text style={styles.rolePurpose}>
            Purpose: learn the tone, standards, and expectations.
          </Text>
        </View>

        <View style={styles.role}>
          <Text style={styles.roleTitle}>ðŸŒ¿ Contributor</Text>
          <Text style={styles.roleDesc}>Unlocked after:</Text>
          <Text style={styles.bullet}>-  Active grow tracking</Text>
          <Text style={styles.bullet}>-  Demonstrated understanding of fundamentals</Text>
          <Text style={styles.bullet}>-  Time-based participation</Text>
          <Text style={styles.roleDesc}>Can:</Text>
          <Text style={styles.bullet}>-  Ask questions</Text>
          <Text style={styles.bullet}>-  Share observations</Text>
          <Text style={styles.bullet}>-  Participate in guided discussions</Text>
        </View>

        <View style={styles.role}>
          <Text style={styles.roleTitle}>ðŸŒ¾ Cultivator</Text>
          <Text style={styles.roleDesc}>Unlocked through:</Text>
          <Text style={styles.bullet}>-  Consistent, high-quality contributions</Text>
          <Text style={styles.bullet}>-  Helpful responses to others</Text>
          <Text style={styles.bullet}>-  Clear, experience-based insight</Text>
          <Text style={styles.roleDesc}>Can:</Text>
          <Text style={styles.bullet}>-  Start new threads</Text>
          <Text style={styles.bullet}>-  Answer questions</Text>
          <Text style={styles.bullet}>-  Help guide discussions</Text>
        </View>

        <View style={styles.role}>
          <Text style={styles.roleTitle}>ðŸ§  Steward (Future / Limited)</Text>
          <Text style={styles.roleDesc}>Reserved for:</Text>
          <Text style={styles.bullet}>-  Trusted, long-term contributors</Text>
          <Text style={styles.bullet}>-  Subject-matter specialists</Text>
          <Text style={styles.bullet}>-  Moderation support</Text>
          <Text style={styles.rolePurpose}>Role is earned, not requested.</Text>
        </View>

        <Text style={styles.heading}>ðŸª´ Posting Philosophy</Text>
        <Text style={styles.body}>
          Before posting, ask:{"\n"}
          "Will this help someone grow better?"
        </Text>
        <Text style={styles.body}>If the answer is no - don't post it.</Text>

        <Text style={styles.subheading}>Good posts:</Text>
        <Text style={styles.bullet}>-  Share observations</Text>
        <Text style={styles.bullet}>-  Ask specific questions</Text>
        <Text style={styles.bullet}>-  Document cause -> effect</Text>
        <Text style={styles.bullet}>-  Teach something learned the hard way</Text>

        <Text style={styles.heading}>ðŸŒ± Final Note to Members</Text>
        <Text style={styles.body}>The Growers Forum exists because:</Text>
        <Text style={styles.bullet}>-  Good growers are tired of noise</Text>
        <Text style={styles.bullet}>-  Real learning happens slowly</Text>
        <Text style={styles.bullet}>-  Craft deserves respect</Text>

        <Text style={styles.finalNote}>
          There are no algorithms here.{"\n"}
          No chasing engagement.{"\n"}
          No farming attention.{"\n\n"}
          Just growers, learning together.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#27ae60"
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
    color: "#2c3e50"
  },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    color: "#34495e"
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
    color: "#555"
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    marginLeft: 12,
    marginBottom: 6,
    color: "#555"
  },
  rule: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60"
  },
  ruleNumber: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    color: "#27ae60"
  },
  ruleBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555"
  },
  role: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#2c3e50"
  },
  roleDesc: {
    fontSize: 15,
    marginBottom: 6,
    color: "#555"
  },
  rolePurpose: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
    color: "#7f8c8d"
  },
  finalNote: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
    marginBottom: 20,
    color: "#34495e"
  }
});

