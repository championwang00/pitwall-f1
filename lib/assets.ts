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
  // ?v= busts the week-long browser cache whenever a flag is redrawn (v2: China as a full red disc)
  return a2 ? `/api/flag/${countryId}?v=2` : null;
}

/** Official F1 track outline (black, transparent) — formula1.com uses it as a CSS mask on upcoming race cards. */
export function trackOutline(circuitId: string, year?: number | null, round?: number | null) {
  if (year) return `/api/outline/${encodeURIComponent(circuitId)}?year=${year}${round ? `&round=${round}` : ""}`;
  const s = TRACK_SLUG[circuitId];
  return s ? `${CDN}/c_lfill,w_3392/${V}/common/f1/2026/track/2026track${s}blackoutline.svg` : null;
}

export function teamColor(team: string | null | undefined, fallback = "#606066") {
  return (team && TEAMS_2026[team as TeamKey]?.color) || HISTORIC_COLORS[team || ""] || fallback;
}

/**
 * Year-aware livery colour: the main colour of a team's car IN THAT SEASON (2008 McLaren = silver, not 2026 papaya).
 * Ranges are inclusive [from, to, colour]; years not covered fall back to `teamColor`. Kept to the main historical
 * liveries — card surfaces only need the dominant colour.
 */
const LIVERY: Record<string, [number, number, string][]> = {
  mclaren: [[1966, 1967, "#8F969E"], [1968, 1971, "#F47600"], [1972, 1973, "#8F969E"], [1974, 1996, "#D50F25"], [1997, 2014, "#9AA1A9"], [2015, 2016, "#4A4A50"], [2017, 2026, "#F47600"]],
  williams: [[1977, 1977, "#1F4E9C"], [1978, 1984, "#0E7C3A"], [1985, 1993, "#1F4E9C"], [1994, 1997, "#13245C"], [1998, 1999, "#C8102E"], [2000, 2013, "#1B3A6B"], [2014, 2018, "#7F8C9B"], [2019, 2020, "#0A4BB0"], [2021, 2026, "#1868DB"]],
  lotus: [[1958, 1967, "#1E5631"], [1968, 1971, "#B22222"], [1972, 1978, "#1A1A1A"], [1979, 1979, "#0E5A32"], [1980, 1981, "#1E3A8A"], [1982, 1986, "#1A1A1A"], [1987, 1990, "#F2C300"], [1991, 1994, "#1E7B3C"]],
  ferrari: [[1950, 1995, "#C8102E"], [1996, 2026, "#ED1131"]],
  "red-bull": [[2005, 2015, "#1E2A6B"], [2016, 2025, "#3671C6"], [2026, 2026, "#4781D7"]],
  renault: [[1977, 1985, "#FFD800"], [2002, 2006, "#1E7BD0"], [2007, 2008, "#F47A20"], [2009, 2009, "#8F969E"], [2010, 2010, "#FFD800"], [2016, 2020, "#FFD800"]],
  brawn: [[2009, 2009, "#C8F51D"]],
  benetton: [[1986, 1993, "#00A651"], [1994, 2001, "#2E8BD8"]],
  jordan: [[1991, 1991, "#008F4C"], [1992, 1992, "#1F3A93"], [1993, 1995, "#1F7A5A"], [1996, 1996, "#C9A227"], [1997, 2005, "#F9D71C"]],
  tyrrell: [[1968, 1990, "#1E3A8A"], [1991, 1993, "#2F5DA8"], [1994, 1998, "#2B4F9E"]],
  mercedes: [[1954, 1955, "#9AA1A9"], [2010, 2019, "#9AA1A9"], [2020, 2021, "#1A1A1A"], [2022, 2025, "#27F4D2"], [2026, 2026, "#00D7B6"]],
  brabham: [[1962, 1971, "#1E5631"], [1972, 1975, "#8F969E"], [1976, 1981, "#C8102E"], [1982, 1992, "#1B3F8B"]],
  "lotus-f1": [[2012, 2015, "#1A1A1A"]],
  sauber: [[1993, 1995, "#1A1A1A"], [1996, 2005, "#1E4FA0"], [2010, 2018, "#8F969E"], [2019, 2023, "#9B0000"], [2024, 2025, "#52E252"]],
  "toro-rosso": [[2006, 2019, "#1E3D8F"]],
  alpine: [[2021, 2026, "#00A1E8"]],
  "aston-martin": [[1959, 1960, "#1E5631"], [2021, 2026, "#229971"]],
  bar: [[1999, 2005, "#8F969E"]],
  honda: [[1964, 1968, "#8F969E"], [2006, 2006, "#8F969E"], [2007, 2008, "#1E5AA8"]],
};

/** Livery colour of `team` in `year` (falls back to `teamColor` when the year is unknown / not tabled). */
export function teamColorAt(team: string | null | undefined, year: number | null | undefined, fallback = "#606066") {
  const r = team && year ? LIVERY[team]?.find(([a, b]) => year >= a && year <= b) : undefined;
  return r ? r[2] : teamColor(team, fallback);
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
