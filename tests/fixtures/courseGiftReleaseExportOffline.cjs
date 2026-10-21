"use strict";
// Inherited by the installed Expo/Metro child processes. No environment files
// or provider/network calls are part of a local release artifact.
const deny = () => {
  throw Error("R09_RELEASE_EXPORT_NETWORK_BLOCKED");
};
require("node:net").Socket.prototype.connect = deny;
require("node:tls").connect = deny;
for (const mod of ["node:http", "node:https"])
  for (const name of ["request", "get"]) require(mod)[name] = deny;
for (const target of [require("node:dns"), require("node:dns/promises")])
  for (const name of [
    "lookup",
    "resolve",
    "resolve4",
    "resolve6",
    "resolveSrv",
    "resolveTxt"
  ])
    target[name] = deny;
global.fetch = deny;
