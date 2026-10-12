import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";

const dir = process.env.VERCEL ? path.join(os.tmpdir(), "pitwall/database") : path.join(process.cwd(), ".cache/database");
const bundled = path.join(process.cwd(), "data/f1db.db");
const CHECK_MS = 300_000;
let active = bundled;
let checked = 0;
let flight: Promise<string> | null = null;

/** A release is immutable. Check its tag on visits; download only when the tag changes.
 * Vercel's bundled files are read-only, so updated databases live in /tmp. */
export async function latestDatabase(): Promise<string> {
  if (Date.now() - checked < CHECK_MS) return active;
  if (flight) return flight;
  flight = refresh().finally(() => { flight = null; });
  return flight;
}

async function refresh(): Promise<string> {
  const manifest = path.join(dir, "release.json");
  let previous: { tag: string; file: string; checked: number } | null = null;
  try {
    previous = JSON.parse(await fs.readFile(manifest, "utf8"));
    if (previous) {
      await fs.access(previous.file);
      active = previous.file;
      if (Date.now() - previous.checked < CHECK_MS) { checked = previous.checked; return active; }
    }
  } catch {
    previous = null;
    try {
      const release = JSON.parse(await fs.readFile(path.join(process.cwd(), "data/f1db-release.json"), "utf8"));
      if (typeof release.tag === "string") previous = { tag: release.tag, file: bundled, checked: 0 };
    } catch {}
  }
  const json = async (url: string) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(url.includes("releases/latest") ? 5000 : 60_000), headers: { "user-agent": "pitwall-f1" },
      // One release check shared across Vercel instances, without caching a failed download.
      ...(process.env.VERCEL && url.includes("releases/latest") ? { next: { revalidate: 300 } } : { cache: "no-store" as const }) } as RequestInit);
    if (!r.ok) throw new Error(`F1DB ${r.status}`);
    return r;
  };
  try {
    const release = await (await json("https://api.github.com/repos/f1db/f1db/releases/latest")).json();
    const tag = release.tag_name;
    if (typeof tag !== "string" || !/^v\d{4}\.\d+\.\d+$/.test(tag)) throw new Error("Invalid F1DB release");
    if (previous?.tag !== tag) {
      const zipAsset = release.assets?.find((a: any) => a.name === "f1db-sqlite.zip");
      const sumAsset = release.assets?.find((a: any) => a.name === "checksums_sha256.txt");
      if (!zipAsset || !sumAsset) throw new Error("F1DB SQLite asset missing");
      const [zipResponse, sumResponse] = await Promise.all([json(zipAsset.browser_download_url), json(sumAsset.browser_download_url)]);
      const zip = new Uint8Array(await zipResponse.arrayBuffer());
      const sums = await sumResponse.text();
      const expected = sums.split("\n").find((l: string) => /\s\*?f1db-sqlite\.zip\s*$/.test(l))?.trim().split(/\s+/)[0];
      if (!expected || createHash("sha256").update(zip).digest("hex") !== expected) throw new Error("F1DB checksum mismatch");
      const files = unzipSync(zip, { filter: (f) => f.name === "f1db.db" });
      const bytes = files["f1db.db"];
      if (!bytes || Buffer.from(bytes.subarray(0, 16)).toString() !== "SQLite format 3\0") throw new Error("Invalid F1DB SQLite file");
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${tag}.db`);
      const temp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(temp, bytes);
      const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
      const probe = new DatabaseSync(temp, { readOnly: true });
      try {
        if (probe.prepare("PRAGMA quick_check").get().quick_check !== "ok") throw new Error("Corrupt F1DB SQLite file");
        probe.prepare("select year, round from race order by year desc, round desc limit 1").get();
        probe.prepare("select count(*) from race_result").get();
      } finally { probe.close(); }
      await fs.rename(temp, file);
      active = file;
      console.log(`[F1DB] activated ${tag}`);
    }
    checked = Date.now();
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${manifest}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ tag, file: active, checked }));
    await fs.rename(tmp, manifest);
  } catch (error) {
    // Keep the last verified snapshot during outages and retry on the next minute's visit.
    checked = Date.now() - CHECK_MS + 60_000;
    console.warn("[F1DB] refresh failed; keeping last verified database", String(error));
  }
  return active;
}
