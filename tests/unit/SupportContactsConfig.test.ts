import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS
} from "../../src/config/supportContacts";

describe("support contact alias config", () => {
  it("keeps every live GrowPath support alias wired in one shared config", () => {
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
      privacy: "privacy@growpathai.com",
      legal: "legal@growpathai.com",
      security: "security@growpathai.com",
      commercial: "commercial@growpathai.com",
      facility: "facility@growpathai.com",
      courses: "courses@growpathai.com",
      live: "live@growpathai.com",
      noreply: "noreply@growpathai.com",
      notifications: "notifications@growpathai.com"
    });
  });

  it("routes public support topics to the specialized aliases", () => {
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
});
