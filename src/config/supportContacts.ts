export const SUPPORT_CONTACTS = {
  general: "support@growpathai.com",
  help: "help@growpathai.com",
  contact: "contact@growpathai.com",
  hello: "hello@growpathai.com",
  info: "info@growpathai.com",
  admin: "admin@growpathai.com",
  billing: "billing@growpathai.com",
  orders: "orders@growpathai.com",
  sales: "sales@growpathai.com",
  partners: "partners@growpathai.com",
  privacy: "privacy@growpathai.com",
  legal: "legal@growpathai.com",
  security: "security@growpathai.com",
  commercial: "commercial@growpathai.com",
  facility: "facility@growpathai.com",
  courses: "courses@growpathai.com",
  live: "live@growpathai.com",
  noreply: "noreply@growpathai.com",
  notifications: "notifications@growpathai.com"
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
    title: "Orders",
    email: SUPPORT_CONTACTS.orders,
    body: "For order status, fulfillment, pickup, shipping, purchase receipts, or product checkout questions, include the order email, item name, and checkout date."
  },
  {
    title: "Sales",
    email: SUPPORT_CONTACTS.sales,
    body: "For sales questions, demos, product availability, account plan questions, or commercial buying help, include what you are trying to purchase or evaluate."
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
    title: "Courses",
    email: SUPPORT_CONTACTS.courses,
    body: "For course creation, enrollment, lesson access, documents, assignments, or creator education workflows, include the course title and account email."
  },
  {
    title: "Lives",
    email: SUPPORT_CONTACTS.live,
    body: "For live events, Twitch connection, RSVP, reminders, replay access, or live setup issues, include the live title, scheduled date, and host identity."
  },
  {
    title: "Facility Support",
    email: SUPPORT_CONTACTS.facility,
    body: "For facility workflows, include the facility name, role, affected module, and whether the issue blocks compliance, operations, reporting, or team access."
  },
  {
    title: "Partners",
    email: SUPPORT_CONTACTS.partners,
    body: "For partnership, brand, educator, supplier, or facility outreach questions, include your organization name and the workflow you want to connect."
  },
  {
    title: "General Contact",
    email: SUPPORT_CONTACTS.contact,
    body: "For non-support contact requests that do not fit a specialized queue, include the best reply address and a short summary."
  },
  {
    title: "Privacy Requests",
    email: SUPPORT_CONTACTS.privacy,
    body: "For data-rights requests, account export/deletion questions, privacy questions, or privacy policy issues, include the account email and the request type."
  },
  {
    title: "Legal Notices",
    email: SUPPORT_CONTACTS.legal,
    body: "For terms notices, legal notices, compliance notices, or formal business requests, include the relevant account, company, and document context."
  },
  {
    title: "Security Reports",
    email: SUPPORT_CONTACTS.security,
    body: "For suspected vulnerabilities, account abuse, or security incidents, include affected URLs, reproduction steps, timing, and impact. Do not send passwords or private API keys."
  }
] as const;

export function supportLine(email: string, body: string) {
  return `Email ${email}. ${body}`;
}
