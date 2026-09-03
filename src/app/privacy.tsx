import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      title="Privacy Policy"
      updated="September 2, 2026"
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
          title: "Removed Account Evidence Vault",
          body: "When an account is removed, GrowPath may preserve an encrypted, access-restricted snapshot of account information and metadata already stored by the service for safety, security, dispute handling, and valid legal process. Vault data is not public, is excluded from ordinary account exports, and is never sold or used for advertising, recommendations, or AI training. The default retention period is 90 days, after which the snapshot is securely purged unless a valid legal hold requires continued retention. Access and disclosure require the restricted Admin legal-and-safety workflow and are logged."
        },
        {
          title: "Contact",
          body: `For privacy questions or data-rights requests, contact ${SUPPORT_CONTACTS.privacy}. For legal notices, use ${SUPPORT_CONTACTS.legal}. For security reports, use ${SUPPORT_CONTACTS.security}.`
        }
      ]}
    />
  );
}
