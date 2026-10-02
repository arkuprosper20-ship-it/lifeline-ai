const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const files = [
  "src/notification-providers.js",
  "src/views/confirm.js",
  "src/views/delivery-status.js",
  "src/main.js",
  "src/store.js",
  "src/sync.js",
  "src/location.js",
  "src/views/settings.js",
  "src/contacts.js",
  "src/flows/analyze.js",
];

let allOk = true;
for (const f of files) {
  const full = path.join(__dirname, "..", f);
  if (!fs.existsSync(full)) {
    console.log("MISSING", f);
    allOk = false;
    continue;
  }
  const src = fs.readFileSync(full, "utf8");
  const r = spawnSync("node", ["--input-type=module", "--check"], { input: src, encoding: "utf8" });
  if (r.status === 0 && !r.stderr) {
    console.log("OK  ", f);
  } else {
    allOk = false;
    console.log("FAIL", f);
    console.log((r.stderr || "").toString());
  }
}
process.exit(allOk ? 0 : 1);