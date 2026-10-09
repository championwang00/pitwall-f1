import COUNTRY_A2 from "@/data/countries.json";
// Official F1 media CDN (media.formula1.com serves CORS: *). Hotlinked, never re-hosted.
const CDN = "https://media.formula1.com/image/upload";
const V = "v1740000001";

export type TeamKey =
  | "mclaren" | "mercedes" | "ferrari" | "red-bull" | "williams" | "racing-bulls"
  | "aston-martin" | "haas" | "audi" | "alpine" | "cadillac";

/** F1DB constructor id -> F1.com 2026 slug + brand colour */
export const TEAMS_2026: Record<TeamKey, { slug: string; color: string; short: string; nameZh: string }> = {
  mercedes: { slug: "mercedes", color: "#00D7B6", short: "Mercedes", nameZh: "梅赛德斯" },
  ferrari: { slug: "ferrari", color: "#ED1131", short: "Ferrari", nameZh: "法拉利" },
  mclaren: { slug: "mclaren", color: "#F47600", short: "McLaren", nameZh: "迈凯伦" },
  "red-bull": { slug: "redbullracing", color: "#4781D7", short: "Red Bull Racing", nameZh: "红牛" },
  "racing-bulls": { slug: "racingbulls", color: "#6C98FF", short: "Racing Bulls", nameZh: "小红牛" },
  alpine: { slug: "alpine", color: "#00A1E8", short: "Alpine", nameZh: "阿尔派" },
  haas: { slug: "haasf1team", color: "#9C9FA2", short: "Haas", nameZh: "哈斯" },
  audi: { slug: "audi", color: "#F50537", short: "Audi", nameZh: "奥迪" },
  williams: { slug: "williams", color: "#1868DB", short: "Williams", nameZh: "威廉姆斯" },
  "aston-martin": { slug: "astonmartin", color: "#229971", short: "Aston Martin", nameZh: "阿斯顿·马丁" },
  cadillac: { slug: "cadillac", color: "#909090", short: "Cadillac", nameZh: "凯迪拉克" },
};

/** F1DB driver id -> F1.com 2026 image code and team slug */
export const DRIVERS_2026: Record<string, { code: string; team: TeamKey; nameZh: string }> = {
  "max-verstappen": { code: "maxver01", team: "red-bull", nameZh: "维斯塔潘" },
  "isack-hadjar": { code: "isahad01", team: "red-bull", nameZh: "哈贾尔" },
  "lando-norris": { code: "lannor01", team: "mclaren", nameZh: "诺里斯" },
  "oscar-piastri": { code: "oscpia01", team: "mclaren", nameZh: "皮亚斯特里" },
  "george-russell": { code: "georus01", team: "mercedes", nameZh: "拉塞尔" },
  "kimi-antonelli": { code: "andant01", team: "mercedes", nameZh: "安东内利" },
  "charles-leclerc": { code: "chalec01", team: "ferrari", nameZh: "勒克莱尔" },
  "lewis-hamilton": { code: "lewham01", team: "ferrari", nameZh: "汉密尔顿" },
  "fernando-alonso": { code: "feralo01", team: "aston-martin", nameZh: "阿隆索" },
  "lance-stroll": { code: "lanstr01", team: "aston-martin", nameZh: "斯特罗尔" },
  "alexander-albon": { code: "alealb01", team: "williams", nameZh: "阿尔本" },
  "carlos-sainz-jr": { code: "carsai01", team: "williams", nameZh: "塞恩斯" },
  "pierre-gasly": { code: "piegas01", team: "alpine", nameZh: "加斯利" },
  "franco-colapinto": { code: "fracol01", team: "alpine", nameZh: "科拉平托" },
  "esteban-ocon": { code: "estoco01", team: "haas", nameZh: "奥康" },
  "oliver-bearman": { code: "olibea01", team: "haas", nameZh: "贝尔曼" },
  "nico-hulkenberg": { code: "nichul01", team: "audi", nameZh: "霍肯伯格" },
  "gabriel-bortoleto": { code: "gabbor01", team: "audi", nameZh: "博托莱托" },
  "sergio-perez": { code: "serper01", team: "cadillac", nameZh: "佩雷兹" },
  "valtteri-bottas": { code: "valbot01", team: "cadillac", nameZh: "博塔斯" },
  "liam-lawson": { code: "lialaw01", team: "racing-bulls", nameZh: "劳森" },
  "arvid-lindblad": { code: "arvlin01", team: "racing-bulls", nameZh: "林德布拉德" },
  "yuki-tsunoda": { code: "yuktsu01", team: "racing-bulls", nameZh: "角田裕毅" },
};

const FALLBACK_DRIVER = "d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp";
const FALLBACK_CAR = "d_common:f1:2026:fallback:car:2026fallbackcarright.webp";

export function driverPortrait(id: string, w = 440) {
  const d = DRIVERS_2026[id];
  if (!d) return null;
  const s = TEAMS_2026[d.team].slug;
  return `${CDN}/c_lfill,w_${w}/q_auto/${FALLBACK_DRIVER}/${V}/common/f1/2026/${s}/${d.code}/2026${s}${d.code}right.webp`;
}

export function driverNumberArt(id: string) {
  const d = DRIVERS_2026[id];
  if (!d) return null;
  const s = TEAMS_2026[d.team].slug;
  return `${CDN}/c_fit,w_876,h_742/q_auto/${V}/common/f1/2026/${s}/${d.code}/2026${s}${d.code}numberwhitefrless.webp`;
}

export function teamLogo(team: string, w = 96, variant: "white" | "color" = "white") {
  const t = TEAMS_2026[team as TeamKey];
  if (!t) return null;
  return `${CDN}/c_lfill,w_${w}/q_auto/${V}/common/f1/2026/${t.slug}/2026${t.slug}logo${variant === "white" ? "white" : ""}.webp`;
}

export function teamCar(team: string, w = 1200, side: "right" | "left" = "right") {
  const t = TEAMS_2026[team as TeamKey];
  if (!t) return null;
  return `${CDN}/c_lfill,w_${w}/q_auto/${FALLBACK_CAR}/${V}/common/f1/2026/${t.slug}/2026${t.slug}car${side}.webp`;
}

/** F1DB circuit id -> F1.com track-map slug */
const TRACK_SLUG: Record<string, string> = {
  melbourne: "melbourne", shanghai: "shanghai", suzuka: "suzuka", miami: "miami", montreal: "montreal",
  monaco: "montecarlo", catalunya: "catalunya", spielberg: "spielberg", silverstone: "silverstone",
  "spa-francorchamps": "spafrancorchamps", hungaroring: "hungaroring", zandvoort: "zandvoort", monza: "monza",
  madring: "madring", baku: "baku", sepang: "kualalumpur", "marina-bay": "singapore", austin: "austin",
  "mexico-city": "mexicocity", interlagos: "interlagos", "las-vegas": "lasvegas", lusail: "lusail",
  "yas-marina": "yasmarinacircuit", bahrain: "sakhir", jeddah: "jeddah", imola: "imola",
};

export function trackMap(circuitId: string, h = 704) {
  const s = TRACK_SLUG[circuitId];
  return s ? `${CDN}/c_fit,h_${h}/q_auto/${V}/common/f1/2026/track/2026track${s}detailed.webp` : null;
}

/** F1DB grand_prix id -> F1.com 2026 race card photo */
const RACE_CARD: Record<string, string> = {
  australia: "australia", china: "china", japan: "japan", miami: "miami", canada: "canada", monaco: "monaco",
  "barcelona-catalunya": "barcelona-catalunya", austria: "austria", "great-britain": "great-britain",
  belgium: "belgium", hungary: "hungary", netherlands: "netherlands", italy: "italy", spain: "spain",
  azerbaijan: "azerbaijan", bahrain: "bahrain", singapore: "singapore", "united-states": "united-states",
  mexico: "mexico", "sao-paulo": "brazil", "las-vegas": "las-vegas", qatar: "qatar", "abu-dhabi": "abu-dhabi",
};

export function raceCard(gpId: string, w = 1296) {
  const s = RACE_CARD[gpId];
  return s ? `${CDN}/c_lfill,w_${w}/q_auto/${V}/fom-website/static-assets/2026/races/card/${s}.webp` : null;
}

/** Country flag: formula1.com's own circular flag (vector) via /api/flag; flagcdn bitmap fallback for
 *  countries F1 has none for. Always round (globals.css crops every /api/flag/ image to a circle). */
export function flag(countryId: string | null | undefined) {
  const a2 = countryId ? (COUNTRY_A2 as Record<string, string>)[countryId] : null;
  return a2 ? `/api/flag/${countryId}` : null;
}

/** Official F1 track outline (black, transparent) — formula1.com uses it as a CSS mask on upcoming race cards. */
export function trackOutline(circuitId: string) {
  const s = TRACK_SLUG[circuitId];
  return s ? `${CDN}/c_lfill,w_3392/${V}/common/f1/2026/track/2026track${s}blackoutline.svg` : null;
}

export function teamColor(team: string | null | undefined, fallback = "#606066") {
  return (team && TEAMS_2026[team as TeamKey]?.color) || HISTORIC_COLORS[team || ""] || fallback;
}

/** Livery colours for constructors that no longer race — used for accents only. */
const HISTORIC_COLORS: Record<string, string> = {
  lotus: "#1E5631", brabham: "#1B3F8B", tyrrell: "#1E3A8A", cooper: "#0B6E4F", benetton: "#00A651",
  brawn: "#C8F51D", renault: "#FFD800", jordan: "#F9D71C", minardi: "#1A1A1A", sauber: "#52E252",
  "toro-rosso": "#1E3D8F", "force-india": "#F596C8", "racing-point": "#F596C8", alphatauri: "#2B4562",
  "alpha-romeo": "#9B0000", march: "#FF6A00", ligier: "#0055A4", vanwall: "#004225", brm: "#4A5D23",
  matra: "#1C4BA0", bar: "#E0E0E0", honda: "#E40521", toyota: "#CC0000", jaguar: "#004C2C",
  stewart: "#FFFFFF", maserati: "#C8102E", "alfa-romeo": "#9B0000", "lotus-f1": "#B49B57",
};

/** Head-and-shoulders crop of the official portrait (Cloudinary north-gravity fill). */
export function driverBust(id: string, w = 480, h = 560) {
  const d = DRIVERS_2026[id];
  if (!d) return null;
  const s = TEAMS_2026[d.team].slug;
  return `${CDN}/c_fill,g_north,w_${w},h_${h}/q_auto/${FALLBACK_DRIVER}/${V}/common/f1/2026/${s}/${d.code}/2026${s}${d.code}right.webp`;
}
