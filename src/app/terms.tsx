import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";

export default function TermsPage() {
  return (
    <PublicInfoPage
      title="Terms of Service"
      updated="October 21, 2026"
      intro="These terms govern access to GrowPath apps, websites, APIs, subscriptions, AI tools, and facility workflows."
      sections={[
        {
          title: "Use of GrowPath",
          body: "You are responsible for using GrowPath lawfully and for keeping your account credentials secure. GrowPath is a software tool and does not replace professional legal, compliance, cultivation, medical, or financial advice."
        },
        {
          title: "Subscriptions and Billing",
          body: `Payments are processed through the billing provider shown at checkout. For billing, cancellation or refund questions, contact ${SUPPORT_CONTACTS.billing}. These terms and any manual review do not limit your right to a refund, cancellation or other remedy required by applicable law. Facility and commercial features may require an active paid plan.`
        },
        {
          title: "Who Sells Courses",
          body: `Independent creators sell their own courses through GrowPathAI. GrowPathAI hosts the marketplace and sells its own courses and subscriptions. A creator's public profile name is not verified legal seller information. For seller, course-access or purchase questions, contact ${SUPPORT_CONTACTS.general}. This description does not limit any refund, cancellation or other remedy required by applicable law.`
        },
        {
          title: "User Content",
          body: "You retain ownership of the content you add to GrowPath. You grant GrowPath permission to store, process, display, and transmit that content as needed to provide the service."
        },
        {
          title: "AI Outputs",
          body: "AI and diagnostic outputs are informational and may be incomplete or incorrect. Confirm important decisions with direct observation, testing, qualified experts, and applicable regulations."
        },
        {
          title: "Service Changes",
          body: "GrowPath may update features, policies, pricing, or these terms. Continued use after changes means you accept the updated terms."
        },
        {
          title: "Contact",
          body: `For terms, legal, or account notices, contact ${SUPPORT_CONTACTS.legal}. For general account support, use ${SUPPORT_CONTACTS.general}.`
        }
      ]}
    />
  );
}
