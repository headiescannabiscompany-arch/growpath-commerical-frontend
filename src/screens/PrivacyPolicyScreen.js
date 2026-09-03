import React from "react";
import { ScrollView, Text } from "react-native";
import ScreenContainer from "../components/ScreenContainer";

// You can update this content if the policy changes
const PRIVACY_POLICY = `
GrowPath Privacy Policy

Last Updated: September 2, 2026

GrowPath ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.

Information We Collect

Account Information: Email address, username, and password
Profile Information: Display name, profile photo, and bio
Content: Grow logs, plant photos, forum posts, comments, and course content
Payment Information: Processed securely through Stripe (we do not store credit card details)
Automatically Collected Information: Usage Data, Device Information, Location Data (if permitted)

How We Use Your Information

- Provide and maintain the GrowPath service
- Personalize your experience and recommend relevant content
- Process payments and manage subscriptions
- Send notifications about your account and app updates
- Improve app functionality and develop new features
- Prevent fraud and ensure platform security
- Comply with legal obligations

Data Sharing

We do not sell your personal information. We may share data with:
- Service Providers: Hosting (MongoDB Atlas), payments (Stripe), analytics
- Legal Requirements: When required by law or to protect our rights
- Business Transfers: In the event of a merger or acquisition

Removed Account Evidence Vault

When an account is removed, GrowPath may preserve an encrypted, access-restricted snapshot of account information and metadata already stored by the service for safety, security, dispute handling, and valid legal process. Vault data is not public, is excluded from ordinary account exports, and is never sold or used for advertising, recommendations, or AI training. The default retention period is 90 days, after which the snapshot is securely purged unless a valid legal hold requires continued retention. Access and disclosure require the restricted Admin legal-and-safety workflow and are logged.

For the full policy, visit our website or contact support.
`;

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer scroll>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.text}>{PRIVACY_POLICY}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = {
  container: {
    padding: 20
  },
  text: {
    fontSize: 16,
    color: "#222",
    lineHeight: 24
  }
};
