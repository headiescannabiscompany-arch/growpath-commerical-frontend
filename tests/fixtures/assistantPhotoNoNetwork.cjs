const deny = () => { throw new Error("ASSISTANT_PHOTO_CHECKS_NO_NETWORK_OR_DATABASE"); };
require("node:net").Socket.prototype.connect = deny;
require("node:tls").connect = deny;
for (const mod of [require("node:http"), require("node:https")]) mod.request = mod.get = deny;
require("node:dgram").createSocket = deny;
beforeEach(() => { global.fetch = jest.fn(deny); });
