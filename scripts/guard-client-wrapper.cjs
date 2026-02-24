const fs = require("fs");

const target = "src/api/client.ts";
if (!fs.existsSync(target)) {
  console.log("No src/api/client.ts found; skipping guard.");
  process.exit(0);
}

const txt = fs.readFileSync(target, "utf8");
const forbidden = ["export default api", "const api", "createClient", "axios.create"];
const bad = forbidden.filter((s) => txt.includes(s));

if (bad.length) {
  console.error(`${target} violated wrapper-only invariant. Found:`);
  for (const b of bad) console.error(`- ${b}`);
  process.exit(1);
}

console.log("client.ts wrapper-only guard passed.");
