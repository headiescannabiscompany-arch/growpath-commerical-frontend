import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";

export default function TermsPage() {
  return (
    <PublicInfoPage
      title="Terms of Service"
      updated="July 2, 2026"
      intro="These terms govern access to GrowPath apps, websites, APIs, subscriptions, AI tools, and facility workflows."
      sections={[
        {
          title: "Use of GrowPath",
          body: "You are responsible for using GrowPath lawfully and for keeping your account credentials secure. GrowPath is a software tool and does not replace professional legal, compliance, cultivation, medical, or financial advice."
        },
        {
          title: "Subscriptions and Billing",
          body: "Paid plans, trials, renewals, cancellations, and refunds are handled through the billing provider shown at checkout. Facility and commercial features may require an active paid plan."
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
        }
      ]}
    />
  );
}
