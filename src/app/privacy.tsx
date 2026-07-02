import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      title="Privacy Policy"
      updated="July 2, 2026"
      intro="GrowPath collects only the information needed to provide account access, cultivation records, diagnostics, subscriptions, support, and compliance workflows."
      sections={[
        {
          title: "Information We Collect",
          body: "We collect account details, profile information, grow logs, plant photos, facility records, support requests, and technical usage data. Payment details are processed by Stripe; GrowPath does not store full card numbers."
        },
        {
          title: "How We Use Information",
          body: "We use information to operate the app, secure accounts, provide grow and facility tools, process subscriptions, improve reliability, respond to support, and meet legal obligations."
        },
        {
          title: "Sharing",
          body: "We do not sell personal information. We share data with service providers such as hosting, database, payment, monitoring, email, and analytics vendors only as needed to run GrowPath."
        },
        {
          title: "Your Choices",
          body: "You can request an account export or account deletion from your profile privacy controls. Some records may be retained where required for security, legal, tax, billing, or compliance reasons."
        },
        {
          title: "Contact",
          body: "For privacy questions, contact GrowPath support through the support page or your account support channel."
        }
      ]}
    />
  );
}
