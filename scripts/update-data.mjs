// Pulls the latest F1DB release (SQLite) into data/f1db.db, then refreshes the telemetry track outlines.
// Usage: npm run update-data
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const rel = await (await fetch("https://api.github.com/repos/f1db/f1db/releases/latest", { headers: { "user-agent": "pitwall" } })).json();
const asset = rel.assets.find((a) => a.name === "f1db-sqlite.zip");
const sums = await (await fetch(rel.assets.find((a) => a.name === "checksums_sha256.txt").browser_download_url)).text();
console.log("F1DB", rel.tag_name, "published", rel.published_at);
fs.mkdirSync("_data_raw/f1db", { recursive: true });
const zip = "_data_raw/f1db/f1db-sqlite.zip";
fs.writeFileSync(zip, Buffer.from(await (await fetch(asset.browser_download_url)).arrayBuffer()));
const got = execFileSync("shasum", ["-a", "256", zip]).toString().split(" ")[0];
const want = sums.split("\n").find((l) => l.includes("f1db-sqlite.zip"))?.split(/\s+/)[0];
if (got !== want) throw new Error(`checksum mismatch ${got} != ${want}`);
execFileSync("unzip", ["-o", "-q", zip, "-d", "_data_raw/f1db/new"]);
fs.renameSync("_data_raw/f1db/new/f1db.db", "data/f1db.db");
fs.rmSync("_data_raw/f1db/new", { recursive: true, force: true });
console.log("data/f1db.db updated → restart `npm run dev` to reopen the database");
