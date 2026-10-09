"use client";
import Link from "next/link";
import EntityLink, { EntityHref } from "@/components/entity/EntityLink";
import { useEffect, useRef, useState } from "react";
import type { Livery, LiveryPhoto } from "@/lib/carLiveries";
import s from "./racegallery.module.css";
export type CarRaceCard = { year: number; round: number; gp: string; circuit: string; circuitName: string; outline: string | null; driver: string; driverName: string; position: number | null; positionText: string; resultClass: string; livery: Livery | null; photo: LiveryPhoto | null };
export default function CarRaceGallery({ races }: { races: CarRaceCard[] }) {
  const [selected, setSelected] = useState<CarRaceCard | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  const close = () => { dialog.current?.close(); setSelected(null); };
  return <>
    <p className={s.legend}>名次取两位车手中较好者 <span>紫线：杆位</span><span>红点：最快圈</span></p>
    <div className={s.grid}>
      {races.map((race) => <article className={s.card} key={`${race.year}:${race.round}`}>
        {race.photo && <button type="button" className={s.picture} onClick={() => setSelected(race)} aria-label={`查看${race.year}年${race.gp}赛车涂装`}>
          <img src={race.photo.url} alt={race.photo.scope === "race" ? `${race.gp} · ${race.livery?.name ?? "赛车实拍"}` : race.photo.caption} loading="lazy" width={480} height={300}
            /* fill the frame (inline: never depends on a stylesheet hot-reload) — no bands above / below a wider photo */
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%" }} />
          {race.livery?.kind === "special" && <span className={s.special}>特殊涂装</span>}
          {race.livery?.kind === "update" && <span className={s.update}>{race.livery.name}</span>}
        </button>}
        {!race.photo && race.livery && <button type="button" className={`${s.picture} ${s.pending}`} onClick={() => setSelected(race)} aria-label={`查看${race.year}年${race.gp}赛车涂装`}><b>{race.livery.name}</b><span>已核实涂装 · 照片待补</span><span className={race.livery.kind === "special" ? s.special : s.update}>{race.livery.kind === "special" ? "特殊涂装" : "标识更新"}</span></button>}
        {race.photo && race.photo.scope !== "race" && <p className={s.reference}>{race.livery?.kind === "special" ? "涂装参考图" : race.photo.scope === "season" ? "赛季参考图" : "车型参考图"}{race.livery?.appliesTo ? ` · ${race.livery.appliesTo}` : ""}</p>}
        <div className={s.info}>
          <div className={s.heading}><EntityHref href={`/races/${race.year}/${race.round}`}><small>R{String(race.round).padStart(2, "0")}{races.some(r => r.year !== race.year) ? ` · ${race.year}` : ""}</small><h3>{race.gp}</h3></EntityHref>
            <EntityHref href={`/races/${race.year}/${race.round}`} className={`${race.resultClass} ${s.result}`} aria-label={`${race.positionText}，查看比赛`}>{race.position ? `P${race.position}` : "R"}</EntityHref></div>
          <div className={s.bottom}><EntityLink kind="circuit" id={race.circuit} year={race.year} className={s.track}>{race.outline && <img src={race.outline} alt="" width={48} height={30} loading="lazy" />}<span>{race.circuitName}</span></EntityLink>
            <EntityLink kind="driver" id={race.driver} year={race.year} className={s.driver}>{race.driverName}</EntityLink></div>
        </div>
      </article>)}
    </div>
    <dialog ref={dialog} className={s.dialog} aria-labelledby="car-livery-title" onCancel={() => setSelected(null)} onClick={e => { if(e.target === e.currentTarget) close(); }}>
      {selected && <><button type="button" className={s.close} onClick={close} aria-label="关闭涂装照片">×</button>
        {selected.photo && <img className={s.large} src={selected.photo.url} alt={`${selected.year} ${selected.gp} · ${selected.livery?.name ?? "赛车涂装参考"}`} />}
        <div className={s.detail}><small>{selected.year} · R{String(selected.round).padStart(2, "0")} · {selected.gp}</small><h2 id="car-livery-title">{selected.livery?.name ?? (selected.photo?.scope === "race" ? "本站赛车实拍" : "赛车涂装参考")}</h2>
          {!selected.livery && selected.photo?.scope !== "race" && <p>{selected.photo?.scope === "season" ? "该赛季赛车的涂装参考照片，拍摄场次见图片来源。" : "车型参考照片，拍摄年份与场景见图片来源。"}</p>}
          <p>{selected.livery?.description}</p><div className={s.links}><Link href={`/races/${selected.year}/${selected.round}`}>查看这场比赛 →</Link><Link href={`/circuits/${selected.circuit}?year=${selected.year}`}>{selected.circuitName} →</Link></div>
          {selected.livery?.id === "rb18-2022-honda-return" && selected.round === 18 && <p className={s.photoNote}>照片中的 Honda 字样位于座舱后方、Oracle 标识上方的发动机罩侧面。</p>}
          {selected.livery && !selected.photo && <p className={s.credit}><a href={selected.livery.source} target="_blank" rel="noreferrer">涂装资料来源 →</a></p>}
          {selected.photo && <p className={s.credit}>{selected.photo.caption}{selected.photo.author ? ` · ${selected.photo.author}` : ""} · <a href={selected.photo.source} target="_blank" rel="noreferrer">图片来源与许可</a>{selected.livery && <> · <a href={selected.livery.source} target="_blank" rel="noreferrer">涂装资料</a></>}</p>}
        </div></>}
    </dialog>
  </>;
}
