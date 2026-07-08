import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS
} from "../../src/config/supportContacts";

describe("support contact alias config", () => {
  it("keeps every live GrowPath support alias wired in one shared config", () => {
    expect(SUPPORT_CONTACTS).toEqual({
      general: "support@growpathai.com",
      billing: "billing@growpathai.com",
      privacy: "privacy@growpathai.com",
      legal: "legal@growpathai.com",
      security: "security@growpathai.com",
      commercial: "commercial@growpathai.com",
      facility: "facility@growpathai.com"
    });
  });

  it("routes public support topics to the specialized aliases", () => {
    const routedEmails = SUPPORT_CONTACT_ROUTING.map((route) => route.email);

    expect(routedEmails).toEqual(
      expect.arrayContaining([
        SUPPORT_CONTACTS.general,
        SUPPORT_CONTACTS.billing,
        SUPPORT_CONTACTS.commercial,
        SUPPORT_CONTACTS.facility,
        SUPPORT_CONTACTS.privacy
      ])
    );
  });
});
