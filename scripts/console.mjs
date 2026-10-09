// Usage: node scripts/console.mjs <url> [waitMs] — prints browser console errors / page errors
import { chromium } from "playwright";
const [url, wait = "4000"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[${m.type()}]`, m.text().slice(0, 600)); });
p.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 800)));
p.on("response", (r) => { if (r.status() >= 400) console.log("[http]", r.status(), r.url().slice(0, 200)); });
await p.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await p.waitForTimeout(+wait);
await b.close();
