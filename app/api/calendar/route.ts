import { seasonSchedule } from "@/lib/schedule";
import { gpZh } from "@/lib/names";
import { SESSION_ZH } from "@/lib/openf1";

// GET /api/calendar?year=2026&scope=all|main&round=17&download=1
// Serves an RFC 5545 calendar. Subscribe with webcal://<host>/api/calendar to get updates automatically.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 73) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = +(url.searchParams.get("year") ?? new Date().getUTCFullYear());
  const scope = url.searchParams.get("scope") ?? "all";
  const round = url.searchParams.get("round");
  const origin = `${url.protocol}//${url.host}`;
  const sched = await seasonSchedule(year);
  const now = stamp(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PITWALL//F1 Calendar//ZH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:F1 ${year} 赛历${scope === "main" ? "（排位与正赛）" : ""}`, "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
  ];
  for (const r of sched) {
    if (round && String(r.round) !== round) continue;
    for (const s of r.sessions) {
      if (scope === "main" && !/^(Race|Qualifying|Sprint)$/.test(s.name)) continue;
      const title = `F1 · ${gpZh(r.gp)} · ${SESSION_ZH[s.name] ?? s.name}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:pitwall-${year}-r${r.round}-${s.name.replace(/\s+/g, "-").toLowerCase()}@pitwall.local`,
        `DTSTAMP:${now}`, `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(s.end)}`,
        fold(`SUMMARY:${esc(title)}`),
        fold(`LOCATION:${esc(`${r.circuitName}, ${r.place}`)}`),
        fold(`DESCRIPTION:${esc(`第 ${r.round} 站 · ${r.official}\n${origin}/races/${year}/${r.round}`)}`),
        `URL:${origin}/races/${year}/${r.round}`,
        ...(s.name === "Race" ? ["BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", fold(`DESCRIPTION:${esc(title)} 30 分钟后开始`), "END:VALARM"] : []),
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  const name = `f1-${year}${round ? `-r${round}` : ""}${scope === "main" ? "-main" : ""}.ics`;
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "public, max-age=1800",
    },
  });
}
