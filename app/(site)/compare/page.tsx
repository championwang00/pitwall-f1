import Link from "next/link";
import { ViewTransition } from "react";
import s from "@/components/compare/compare.module.css";
import { getDriver, headToHead, driverSeasons, facts } from "@/lib/f1";
import { drivers as dContent } from "@/lib/content";
import { driverBust, teamColor, flag, DRIVERS_2026 } from "@/lib/assets";
import { driverImage } from "@/lib/wiki";
import { gpZh, TEAM_ZH } from "@/lib/names";
import { resClassServer } from "@/lib/res";
import Picker from "@/components/compare/Picker";
import EntityLink from "@/components/entity/EntityLink";
import Person from "@/components/entity/Person";
import { zhName } from "@/lib/zh";
import { all } from "@/lib/db";
import x from "./compare.module.css";
import Breadcrumb from "@/components/shell/Breadcrumb";

export const dynamic = "force-dynamic";

const PRESETS: [string, string, string][] = [
  ["lewis-hamilton", "max-verstappen", "2021 年的宿敌"],
  ["ayrton-senna", "alain-prost", "麦克拉伦队友之争"],
  ["kimi-antonelli", "george-russell", "2026 梅赛德斯队内"],
  ["michael-schumacher", "lewis-hamilton", "七冠对七冠"],
  ["lando-norris", "oscar-piastri", "迈凯伦队内"],
  ["charles-leclerc", "lewis-hamilton", "2026 法拉利队内"],
];

/** 车手 › 对比 (v5 §0.5.3; ` › Y` joins with the ?year= slice, P2-3) */
const CRUMBS = [{ label: "车手", href: "/drivers" }, { label: "对比" }];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  const a = sp.a ?? "lewis-hamilton", b = sp.b ?? "max-verstappen";
  const A = getDriver(a), B = getDriver(b);
  if (!A || !B) return <div><Breadcrumb items={CRUMBS} /><div className="wrap band"><p>找不到车手。</p></div></div>;
  const dz = dContent();
  const zh = (id: string, n: string) => dz[id]?.nameZh ?? DRIVERS_2026[id]?.nameZh ?? zhName.driver(id) ?? n;
  const h2h = headToHead(a, b);
  const both = h2h.filter((r: any) => r.aPos || r.bPos);
  const aAhead = both.filter((r: any) => (r.aPos ?? 99) < (r.bPos ?? 99)).length;
  const bAhead = both.length - aAhead;
  const sameTeam = h2h.filter((r: any) => r.aTeam === r.bTeam);
  const stA = driverSeasons(a), stB = driverSeasons(b);
  const fa = facts({ driver: a }), fb = facts({ driver: b });
  const imgA = driverBust(a, 480, 560) ?? (await driverImage(a));
  const imgB = driverBust(b, 480, 560) ?? (await driverImage(b));
  const sig = (rows: { team: string }[]) => {
    const m = new Map<string, number>();
    for (const f of rows) m.set(f.team, (m.get(f.team) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  };
  const colA = teamColor(DRIVERS_2026[a]?.team ?? sig(fa), "#606066");
  let colB = teamColor(DRIVERS_2026[b]?.team ?? sig(fb), "#9a9aa6");
  if (colB === colA) colB = "#47464c";
  const rows: [string, number, number, boolean?][] = [
    ["世界冠军", A.total_championship_wins, B.total_championship_wins],
    ["分站冠军", A.total_race_wins, B.total_race_wins],
    ["领奖台", A.total_podiums, B.total_podiums],
    ["杆位", A.total_pole_positions, B.total_pole_positions],
    ["最快圈", A.total_fastest_laps, B.total_fastest_laps],
    ["出赛", A.total_race_starts, B.total_race_starts],
    ["胜率 %", +(100 * A.total_race_wins / Math.max(1, A.total_race_starts)).toFixed(1), +(100 * B.total_race_wins / Math.max(1, B.total_race_starts)).toFixed(1)],
    ["领奖台率 %", +(100 * A.total_podiums / Math.max(1, A.total_race_starts)).toFixed(1), +(100 * B.total_podiums / Math.max(1, B.total_race_starts)).toFixed(1)],
  ];
  // circuits both raced at: wins each
  const circ = new Map<string, { a: number; b: number; an: number; bn: number }>();
  for (const f of fa) { const c = circ.get(f.circuit) ?? { a: 0, b: 0, an: 0, bn: 0 }; c.an++; if (f.pos === 1) c.a++; circ.set(f.circuit, c); }
  for (const f of fb) { const c = circ.get(f.circuit) ?? { a: 0, b: 0, an: 0, bn: 0 }; c.bn++; if (f.pos === 1) c.b++; circ.set(f.circuit, c); }
  const circRows = [...circ.entries()].filter(([, v]) => v.an && v.bn && (v.a || v.b)).sort((x, y) => (y[1].a + y[1].b) - (x[1].a + x[1].b)).slice(0, 14);
  const circIds = circRows.map(([c]) => c);
  const circName = new Map(all<any>(`select id, name from circuit where id in (${circIds.map(() => "?").join(",") || "''"})`, ...circIds).map((r) => [r.id, zhName.circuit(r.id) ?? r.name]));
  const heads = (
    <div className={x.heads}>
      <Person id={a} name={zh(a, A.name)} size={36} className={x.pa} preview={false} color={colA} />
      <Person id={b} name={zh(b, B.name)} size={36} className={x.pb} preview={false} color={colB} />
    </div>
  );

  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div>
        <section className={s.hero}>
          <div className={s.heroIn}>
            {/* on the two team-colour halves, top-left (user: the crumb lives inside the first block, no strip) */}
            <Breadcrumb items={CRUMBS} style={{ position: "absolute", top: 20, left: 0, zIndex: 3, margin: 0 }} />
            {[{ d: A, id: a, img: imgA, col: colA, side: "a" as const }, { d: B, id: b, img: imgB, col: colB, side: "b" as const }].map(({ d, id, img, col, side }) => (
              <div key={side} className={`${s.side} ${side === "b" ? s.right : ""}`} style={{ ["--team" as any]: col }}>
                {img && <img className={driverBust(id) ? s.bust : s.photo} src={img} alt="" />}
                <div className={s.sideText}>
                  <EntityLink kind="driver" id={id} className={s.name} preview={false}>
                    <span className="lat">{d.first_name}</span>
                    <b className="lat" style={d.last_name.length > 8 ? { fontSize: "clamp(24px, 2.7vw, 40px)" } : undefined}>{d.last_name}</b>
                  </EntityLink>
                  <p className={s.zh}>{flag(d.nationality_country_id) && <img src={flag(d.nationality_country_id)!} alt="" />}{zh(id, d.name)}</p>
                  <Picker a={a} b={b} side={side} />
                </div>
              </div>
            ))}
            <div className={s.vs}>
              <span className="num">{aAhead}</span>
              <em>同场名次交锋 · <b>{both.length}</b> 场</em>
              <span className="num">{bAhead}</span>
            </div>
          </div>
        </section>

        <section className="band band-paper">
          <div className="wrap">
            <div className={s.presets}>
              {PRESETS.map(([x, y, t]) => <Link key={t} href={`/compare?a=${x}&b=${y}`} className="chip">{t}</Link>)}
            </div>
            <div className={s.bars}>
              <div className={x.barHeads}>{heads}</div>
              {rows.map(([k, va, vb]) => {
                const max = Math.max(va, vb, 1);
                return (
                  <div key={k} className={s.bar}>
                    <span className={`num ${va > vb ? s.win : ""}`}>{va}</span>
                    <span className={s.track}><i style={{ width: `${(va / max) * 100}%`, background: colA }} /></span>
                    <b>{k}</b>
                    <span className={`${s.track} ${s.trackR}`}><i style={{ width: `${(vb / max) * 100}%`, background: colB }} /></span>
                    <span className={`num ${vb > va ? s.win : ""}`}>{vb}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {h2h.length > 0 && (
          <section className="band band-white">
            <div className="wrap">
              <div className="sec-head">
                <h2 className="cn-h2">同场交锋</h2>
                <span className="sub">{h2h.length} 场共同出赛{sameTeam.length ? ` · 其中 ${sameTeam.length} 场是队友` : ""}。上排 <EntityLink kind="driver" id={a} className="ilink" preview={false}>{zh(a, A.last_name)}</EntityLink>，下排 <EntityLink kind="driver" id={b} className="ilink" preview={false}>{zh(b, B.last_name)}</EntityLink></span>
              </div>
              <div className={s.duel}>
                {h2h.map((r: any) => (
                  <Link key={r.year + "-" + r.round} href={`/races/${r.year}/${r.round}`} className={`${s.duelCol} ${r.aTeam === r.bTeam ? s.mates : ""}`} title={`${r.year} ${gpZh(r.gp)}`}>
                    <span className={resClassServer(r.aPos, r.aText)}>{r.aPos ?? "R"}</span>
                    <span className={resClassServer(r.bPos, r.bText)}>{r.bPos ?? "R"}</span>
                    <em>{String(r.year).slice(2)}</em>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {circRows.length > 0 && (
          <section className="band band-paper">
            <div className="wrap">
              <div className="sec-head"><div><p className="kicker">Circuits</p><h2 className="cn-h2">在两人都跑过的赛道上</h2></div><span className="sub">分站冠军数</span></div>
              <div className={x.tblWrap}>
              <table className="tbl row-hover">
                <thead>
                  <tr>
                    <th className="r"><Person id={a} name={zh(a, A.name)} size={26} className={`${x.thP} ${x.thA}`} preview={false} color={colA} /></th>
                    <th style={{ textAlign: "center" }}>赛道</th>
                    <th><Person id={b} name={zh(b, B.name)} size={26} className={x.thP} preview={false} color={colB} /></th>
                  </tr>
                </thead>
                <tbody>
                  {circRows.map(([c, v]) => (
                    <tr key={c}>
                      <td className="r num" style={{ width: 80, color: v.a > v.b ? "var(--ink)" : "var(--mute)" }}>{v.a}<small className={x.unit}>胜</small></td>
                      <td style={{ textAlign: "center" }}><EntityLink kind="circuit" id={c} href={`/circuits/${c}?driver=${a}`} className="ilink">{circName.get(c) ?? c}</EntityLink></td>
                      <td className="num" style={{ width: 80, color: v.b > v.a ? "var(--ink)" : "var(--mute)" }}>{v.b}<small className={x.unit}>胜</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </ViewTransition>
  );
}
