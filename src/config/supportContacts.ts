export const SUPPORT_CONTACTS = {
  general: "support@growpathai.com",
  billing: "billing@growpathai.com",
  privacy: "privacy@growpathai.com",
  legal: "legal@growpathai.com",
  security: "security@growpathai.com",
  commercial: "commercial@growpathai.com",
  facility: "facility@growpathai.com"
} as const;

export const SUPPORT_CONTACT_ROUTING = [
  {
    title: "Account and Login",
    email: SUPPORT_CONTACTS.general,
    body: "For login trouble, password resets, email verification, or account access, include the email address on the account and the approximate time the issue started."
  },
  {
    title: "Billing",
    email: SUPPORT_CONTACTS.billing,
    body: "For subscription, invoice, checkout, or Stripe billing issues, include the plan name, billing email, date of charge, and any error shown during checkout."
  },
  {
    title: "Technical Issues",
    email: SUPPORT_CONTACTS.general,
    body: "For app problems, include your browser or device, the page or workflow, steps to reproduce, and screenshots when possible. Do not send passwords or private API keys."
  },
  {
    title: "Commercial / Storefront",
    email: SUPPORT_CONTACTS.commercial,
    body: "For storefront, product, course, live, Stripe setup, Feed/Campaigns, or brand workflow issues, include the brand name and affected page."
  },
  {
    title: "Facility Support",
    email: SUPPORT_CONTACTS.facility,
    body: "For facility workflows, include the facility name, role, affected module, and whether the issue blocks compliance, operations, reporting, or team access."
  },
  {
    title: "Privacy, Legal, or Security",
    email: SUPPORT_CONTACTS.privacy,
    body: "For privacy requests, use privacy@growpathai.com. For legal notices, use legal@growpathai.com. For security reports, use security@growpathai.com."
  }
] as const;

export function supportLine(email: string, body: string) {
  return `Email ${email}. ${body}`;
}
