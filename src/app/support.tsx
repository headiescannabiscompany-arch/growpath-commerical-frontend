import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";
import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS,
  supportLine
} from "@/config/supportContacts";

export default function SupportPage() {
  return (
    <PublicInfoPage
      title="Support"
      intro="Use this page to route account, billing, orders, sales, technical, privacy, legal, security, commercial, courses, live events, partner, and facility support requests to the GrowPath team."
      sections={[
        ...SUPPORT_CONTACT_ROUTING.map((item) => ({
          title: item.title,
          body: supportLine(item.email, item.body)
        })),
        {
          title: "Contact",
          body: `Start with ${SUPPORT_CONTACTS.general} if you are unsure. For urgent production incidents, include URGENT in the subject and describe the business impact.`
        }
      ]}
    />
  );
}
