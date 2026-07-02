import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";

export default function SupportPage() {
  return (
    <PublicInfoPage
      title="Support"
      intro="Use this page to route account, billing, technical, and facility support requests to the GrowPath team."
      sections={[
        {
          title: "Account and Login",
          body: "For login trouble, password resets, email verification, or account access, include the email address on the account and the approximate time the issue started."
        },
        {
          title: "Billing",
          body: "For subscription, invoice, checkout, or Stripe billing issues, include the plan name, billing email, date of charge, and any error shown during checkout."
        },
        {
          title: "Technical Issues",
          body: "For app problems, include your browser or device, the page or workflow, steps to reproduce, and screenshots when possible. Do not send passwords or private API keys."
        },
        {
          title: "Facility Support",
          body: "For facility workflows, include the facility name, role, affected module, and whether the issue blocks compliance, operations, reporting, or team access."
        },
        {
          title: "Contact",
          body: "Email support@growpathai.com for help. For urgent production incidents, include URGENT in the subject and describe the business impact."
        }
      ]}
    />
  );
}
