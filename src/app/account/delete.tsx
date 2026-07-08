import React from "react";

import PublicInfoPage from "@/components/PublicInfoPage";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";

export default function DeleteAccountPage() {
  return (
    <PublicInfoPage
      title="Delete Account"
      intro="GrowPath provides in-app account deletion controls for signed-in users and support-assisted deletion when you cannot access your account."
      sections={[
        {
          title: "Delete In App",
          body: "Sign in, open Profile, go to Privacy and account data, type DELETE in the confirmation field, and press Delete account. The app will ask for final confirmation before submitting the deletion request."
        },
        {
          title: "If You Cannot Sign In",
          body: `Email ${SUPPORT_CONTACTS.general} from the email address on the account and request account deletion. We may need to verify ownership before processing the request.`
        },
        {
          title: "Data Export",
          body: "You can export account data from the same Profile privacy controls before deletion. Download and review your export before deleting the account if you need a copy."
        },
        {
          title: "Retention",
          body: "Some records may be retained where required for fraud prevention, security, legal, tax, billing, or compliance obligations. Retained records are limited to what is necessary."
        }
      ]}
    />
  );
}
