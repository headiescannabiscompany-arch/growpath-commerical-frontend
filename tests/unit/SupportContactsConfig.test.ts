import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS
} from "../../src/config/supportContacts";

describe("support contact alias config", () => {
  it("uses the configured public contacts and owner-confirmed privacy/legal mailbox", () => {
    expect(SUPPORT_CONTACTS).toEqual({
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
      privacy: "admin@growpathai.com",
      legal: "admin@growpathai.com",
      security: "security@growpathai.com",
      commercial: "commercial@growpathai.com",
      facility: "facility@growpathai.com",
      courses: "courses@growpathai.com",
      live: "live@growpathai.com",
      noreply: "noreply@growpathai.com",
      notifications: "notifications@growpathai.com"
    });
  });

  it("routes public support topics to their configured inboxes", () => {
    const routedEmails = SUPPORT_CONTACT_ROUTING.map((route) => route.email);

    expect(routedEmails).toEqual(
      expect.arrayContaining([
        SUPPORT_CONTACTS.general,
        SUPPORT_CONTACTS.billing,
        SUPPORT_CONTACTS.orders,
        SUPPORT_CONTACTS.sales,
        SUPPORT_CONTACTS.commercial,
        SUPPORT_CONTACTS.courses,
        SUPPORT_CONTACTS.live,
        SUPPORT_CONTACTS.facility,
        SUPPORT_CONTACTS.partners,
        SUPPORT_CONTACTS.contact,
        SUPPORT_CONTACTS.privacy,
        SUPPORT_CONTACTS.legal,
        SUPPORT_CONTACTS.security
      ])
    );
  });

  it("keeps sender-only aliases out of public support routing", () => {
    const routedEmails = SUPPORT_CONTACT_ROUTING.map((route) => route.email);

    expect(routedEmails).not.toContain(SUPPORT_CONTACTS.noreply);
    expect(routedEmails).not.toContain(SUPPORT_CONTACTS.notifications);
  });

  it("routes both privacy and legal topics to the monitored Admin mailbox", () => {
    for (const title of ["Privacy Requests", "Legal Notices"]) {
      expect(SUPPORT_CONTACT_ROUTING.find((route) => route.title === title)?.email).toBe(
        "admin@growpathai.com"
      );
    }
    expect(SUPPORT_CONTACT_ROUTING.map((route) => route.email)).not.toEqual(
      expect.arrayContaining(["privacy@growpathai.com", "legal@growpathai.com"])
    );
  });
});
