import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { getRaceByYearRound } from "@/lib/f1";
import { timingWeekends, doneSessions } from "@/lib/live";
import { seasonSchedule } from "@/lib/schedule";
import { gpZh } from "@/lib/names";
import { raceReplayPath } from "@/lib/raceCards";
import { raceReplayRail } from "@/lib/railData";
import { Panel } from "@/components/live/LivePage";
import RailScope from "@/components/season/RailScope";
import type { Crumb } from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
type P = { params: Promise<{ year: string; round: string }>; searchParams: Promise<SP> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => { const n = Number(one(v)); return Number.isFinite(n) && n > 0 ? n : null; };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { year, round } = await params;
  const race = getRaceByYearRound(+year, +round);
  return race ? { title: `${year} ${gpZh(race.grand_prix_id)} · 计时回放 · PITWALL` } : {};
}

/**
 * /races/Y/R/replay[?session=K][&a&b] — the canonical replay page (IA spec v5.1 §0.5): a child of the race, showing
 * ONLY this race weekend — breadcrumb 历史 › Y › 第 R 站 {GP} › 回放 · {节次}, the panel's own compact title block with the
 * weekend's session switcher (default 正赛), then the full timing viewer. No season hero, no other rounds.
 * No OpenF1 data (before 2023, or not run yet) → the race page.
 */
export default async function RaceReplayPage({ params, searchParams }: P) {
  const { year: ys, round: rs } = await params;
  const year = +ys, round = +rs;
  const sp = await searchParams;
  const race = getRaceByYearRound(year, round);
  if (!race) notFound();
  const back = `/races/${year}/${round}`;
  // OpenF1 covers 2023 onwards: older races never get a replay
  if (year < 2023 || year > new Date().getUTCFullYear()) permanentRedirect(back);

  const [weekends, schedule] = await Promise.all([timingWeekends(year), seasonSchedule(year).catch(() => [])]);
  const meetingKey = schedule.find((r) => r.round === round)?.meetingKey ?? null;
  const wk = weekends.find((w) => meetingKey != null && w.meeting_key === meetingKey) ?? weekends.find((w) => w.race === back) ?? null;
  const asked = num(sp.session);

  // a session key from another weekend → that weekend's replay page (the key owns the page)
  if (asked && weekends.length && !wk?.sessions.some((x) => x.session_key === asked)) {
    const owner = weekends.find((w) => w.sessions.some((x) => x.session_key === asked));
    const m = owner?.race?.match(/^\/races\/(\d+)\/(\d+)$/);
    if (m) {
      const extra = new URLSearchParams();
      for (const k of ["a", "b"]) { const v = one(sp[k]); if (v) extra.set(k, v); }
      permanentRedirect(raceReplayPath(+m[1], +m[2], asked, extra));
    }
  }

  const { race: raceSess, latest } = wk ? doneSessions([wk]) : { race: null, latest: null };
  // OpenF1 answered but this weekend has no finished session yet → the race page (temporary: it will have one)
  if (weekends.length && !latest) redirect(back);

  const done = (k: number | null) => wk?.sessions.find((x) => x.session_key === k && Date.parse(x.date_end) < Date.now()) ?? null;
  const initial = done(asked) ?? raceSess ?? latest;
  const gp = gpZh(race.grand_prix_id);
  const crumbs: Crumb[] = [
    { label: "历史", href: "/seasons" },
    { label: year, kind: "year", id: String(year), href: `/seasons/${year}`, name: String(year) },
    { label: <>第 <span className="num">{round}</span> 站 {gp}</>, href: back, name: `第 ${round} 站 ${gp}` },
  ];
  return (
    <div data-page="replay">
      <RailScope {...raceReplayRail(year, round)} />
      <Panel
        weekends={wk ? [wk] : []} initialKey={initial?.session_key ?? null} liveKey={null} fallbackKey={raceSess?.session_key ?? null}
        initialA={num(sp.a)} initialB={num(sp.b)} focus={false}
        crumbs={crumbs} archive={{ href: back, label: "返回本站档案" }}
      />
    </div>
  );
}
