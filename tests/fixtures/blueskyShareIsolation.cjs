// This bounded pure formatter package must never contact a service or database.
const deny = () => {
  throw new Error("Bluesky local checks forbid network access");
};
require("node:net").Socket.prototype.connect = deny;
require("node:http").request = deny;
require("node:http").get = deny;
require("node:https").request = deny;
require("node:https").get = deny;
require("node:tls").connect = deny;
require("node:dgram").createSocket = deny;
global.fetch = deny;
jest.mock("react-native", () => ({
  Platform: { OS: "web" },
  Share: { share: jest.fn() }
}));
