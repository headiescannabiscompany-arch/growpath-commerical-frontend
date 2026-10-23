const deny = () => {
  throw new Error("Plant ID local checks forbid network access");
};
require("node:net").Socket.prototype.connect = deny;
require("node:net").Server.prototype.listen = deny;
require("node:http").request = deny;
require("node:http").get = deny;
require("node:https").request = deny;
require("node:https").get = deny;
require("node:tls").connect = deny;
require("node:dgram").createSocket = deny;
global.fetch = deny;
