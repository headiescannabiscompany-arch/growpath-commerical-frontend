import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS
} from "../../src/config/supportContacts";

describe("support contact alias config", () => {
  it("routes public support aliases through the support inbox", () => {
    expect(SUPPORT_CONTACTS).toEqual({
      general: "support@growpathai.com",
      help: "support@growpathai.com",
      contact: "support@growpathai.com",
      hello: "support@growpathai.com",
      info: "support@growpathai.com",
      admin: "support@growpathai.com",
      billing: "support@growpathai.com",
      orders: "support@growpathai.com",
      sales: "support@growpathai.com",
      partners: "support@growpathai.com",
      privacy: "support@growpathai.com",
      legal: "support@growpathai.com",
      security: "support@growpathai.com",
      commercial: "support@growpathai.com",
      facility: "support@growpathai.com",
      courses: "support@growpathai.com",
      live: "support@growpathai.com",
      noreply: "noreply@growpathai.com",
      notifications: "notifications@growpathai.com"
    });
  });

  it("routes public support topics to the shared support inbox", () => {
    const routedEmails = SUPPORT_CONTACT_ROUTING.map((route) => route.email);

    expect(new Set(routedEmails)).toEqual(new Set([SUPPORT_CONTACTS.general]));
  });

  it("keeps sender-only aliases out of public support routing", () => {
    const routedEmails = SUPPORT_CONTACT_ROUTING.map((route) => route.email);

    expect(routedEmails).not.toContain(SUPPORT_CONTACTS.noreply);
    expect(routedEmails).not.toContain(SUPPORT_CONTACTS.notifications);
  });
});
