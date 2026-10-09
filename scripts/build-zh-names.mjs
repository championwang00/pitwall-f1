// Builds data/zh-names.json: Simplified-Chinese names for drivers / constructors / circuits via Wikipedia langlinks.
// en title (data/wiki.json) -> zh title (langlinks) -> zh-cn variant title (inprop=varianttitles).
import fs from "node:fs";
const wiki = JSON.parse(fs.readFileSync("data/wiki.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function j(url) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { "user-agent": "pitwall-f1-demo/0.1 (local)" } });
    if (r.ok) return r.json();
    if (r.status === 414) throw new Error("URI too long");
    await sleep(r.status === 429 ? 15000 * (i + 1) : 2000 * (i + 1));
  }
  throw new Error("fail " + url.slice(0, 120));
}
async function enToZh(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const r = await j(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=langlinks&lllang=zh&lllimit=500&redirects=1&titles=${encodeURIComponent(batch.join("|"))}`);
    const norm = new Map();
    for (const n of r.query?.normalized ?? []) norm.set(n.to, n.from);
    for (const n of r.query?.redirects ?? []) norm.set(n.to, norm.get(n.from) ?? n.from);
    for (const p of Object.values(r.query?.pages ?? {})) {
      const zh = p.langlinks?.[0]?.["*"];
      if (zh) out[norm.get(p.title) ?? p.title] = zh;
    }
    await sleep(1200);
  }
  return out;
}
async function toCN(zhTitles) {
  const out = {};
  // Chinese titles URL-encode long; keep batches small to stay under URL limits
  for (let i = 0; i < zhTitles.length; i += 20) {
    const batch = zhTitles.slice(i, i + 20);
    const r = await j(`https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=info&inprop=varianttitles&titles=${encodeURIComponent(batch.join("|"))}`);
    const norm = new Map();
    for (const n of r.query?.normalized ?? []) norm.set(n.to, n.from);
    for (const p of Object.values(r.query?.pages ?? {})) out[norm.get(p.title) ?? p.title] = p.varianttitles?.["zh-cn"] ?? p.title;
    await sleep(1200);
  }
  return out;
}
const clean = (t) => t.replace(/[（(][^）)]*[）)]$/, "").trim();
const result = {};
for (const kind of ["drivers", "constructors", "circuits"]) {
  const ids = Object.keys(wiki[kind]).filter((id) => wiki[kind][id]);
  const en = ids.map((id) => wiki[kind][id].replace(/_/g, " "));
  const zh = await enToZh(en);
  const cn = await toCN([...new Set(Object.values(zh))]);
  result[kind] = {};
  for (const id of ids) {
    const e = wiki[kind][id].replace(/_/g, " ");
    const z = zh[e];
    if (z) result[kind][id] = clean(cn[z] ?? z);
  }
  console.log(kind, Object.keys(result[kind]).length, "/", ids.length);
}
fs.writeFileSync("data/zh-names.json", JSON.stringify(result));
console.log("written data/zh-names.json");
