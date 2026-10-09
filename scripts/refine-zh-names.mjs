// Converts zh-wiki titles to the zh-cn display title (applies page-level conversion groups, e.g. 加赫特·貝加 → 格哈德·贝格尔).
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("data/zh-names.json", "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cachePath = ".cache/zh-display-v2.json";
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
async function display(title) {
  if (cache[title]) return cache[title];
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`https://zh.wikipedia.org/w/api.php?action=parse&format=json&prop=displaytitle&variant=zh-cn&redirects=1&page=${encodeURIComponent(title)}`, { headers: { "user-agent": "pitwall-f1-demo/0.1 (local)" } });
    if (r.ok) {
      const j = await r.json();
      if (!j.parse?.displaytitle) return title; // missing page: keep what we have
      const t = j.parse.displaytitle.replace(/<[^>]+>/g, "").trim();
      cache[title] = t;
      return t;
    }
    await sleep(r.status === 429 ? 20000 * (i + 1) : 2000);
  }
  return title;
}
const clean = (t) => t.replace(/[（(][^）)]*[）)]$/, "").trim();
let n = 0;
for (const kind of ["drivers", "constructors", "circuits"]) {
  for (const [id, t] of Object.entries(data[kind])) {
    data[kind][id] = clean(await display(t));
    if (++n % 50 === 0) { fs.writeFileSync(cachePath, JSON.stringify(cache)); fs.writeFileSync("data/zh-names.json", JSON.stringify(data)); console.log(n); }
    await sleep(1500);
  }
}
// Hong Kong-style titles that zh-wiki doesn't convert → common mainland F1 transliterations
const FIX = {
  "加赫特·贝加": "格哈德·贝格尔", "尼尔逊·毕奇": "纳尔逊·皮奎特", "尼尔逊·小毕奇": "小纳尔逊·皮奎特", "大卫·库塔": "大卫·库尔特哈德",
  "亚历士·辛尼迪": "亚历克斯·扎纳尔迪", "罗根·沙俊": "洛根·萨金特", "卡伦·查铎": "卡伦·钱多克", "莫里斯·特罕狄酿": "莫里斯·特兰蒂尼昂",
  "路易斯·咸美顿": "刘易斯·汉密尔顿", "沙治奥·佩雷斯": "塞尔吉奥·佩雷兹", "尼可拉斯·贺根堡": "尼科·霍肯伯格", "史特灵·莫斯": "斯特林·莫斯",
  "鲍姆加特纳·若尔特": "若尔特·鲍姆加特纳", "乔治·罗素": "乔治·拉塞尔", "皮埃尔·盖斯利": "皮埃尔·加斯利", "兰斯·斯托尔": "兰斯·斯特罗尔",
};
for (const k of Object.keys(data.drivers)) if (FIX[data.drivers[k]]) data.drivers[k] = FIX[data.drivers[k]];
fs.writeFileSync(cachePath, JSON.stringify(cache));
fs.writeFileSync("data/zh-names.json", JSON.stringify(data));
console.log("done", n);
