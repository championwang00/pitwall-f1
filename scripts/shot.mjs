// Usage: node scripts/shot.mjs <url> <out.png> [width=1440] [full=1] [height=900] [waitMs=1500]
import { chromium } from "playwright";
const [url, out, w = "1440", full = "1", h = "900", wait = "1500"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
// Dismiss common consent overlays on third-party reference sites
for (const sel of ["#truste-consent-required", "button:has-text('Reject All')", "button:has-text('Essential only')"]) {
  const el = page.locator(sel).first();
  if (await el.isVisible().catch(() => false)) await el.click().catch(() => {});
}
await page.addStyleTag({ content: "#truste-consent-track,.truste_overlay,.truste_box_overlay,[id^=sp_message]{display:none!important}" }).catch(() => {});
await page.waitForTimeout(+wait);
if (full === "1") {
  // trigger lazy content
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(800);
}
await page.screenshot({ path: out, fullPage: full === "1" });
await browser.close();
console.log("saved", out);
