"use client";

import { useEffect, useState } from "react";
import s from "./calendar.module.css";
import Icon from "@/components/ui/Icon";

/** Calendar actions. webcal:// keeps the calendar app subscribed (it re-fetches the feed); .ics is a one-off import. */
/** `light`: on the paper page (formula1.com: red "订阅到系统日历" + quiet secondary actions in ink). */
export default function Subscribe({ year, light }: { year: number; light?: boolean }) {
  const [host, setHost] = useState("localhost:3210");
  const [copied, setCopied] = useState(false);
  useEffect(() => setHost(window.location.host), []);
  const feed = `${host}/api/calendar?year=${year}`;
  return (
    <div className={`${s.sub} ${light ? s.subLight : ""}`}>
      <a className="btn btn-red" href={`webcal://${feed}`}>
        <Icon name="calendar-add" size={18} />
        订阅到系统日历
      </a>
      <a className="btn btn-line" href={`/api/calendar?year=${year}&download=1`}>下载全部场次 .ics</a>
      <a className="btn btn-line" href={`/api/calendar?year=${year}&scope=main&download=1`}>只要排位与正赛</a>
      <button className={`btn ${s.copy}`} onClick={() => { navigator.clipboard?.writeText(`http://${feed}`); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
        {copied ? "已复制订阅地址" : "复制订阅地址"}
      </button>
      <p className={s.hint}>订阅后日历会每 6 小时自动同步改期；时间按你的系统时区显示。部署到公网后，订阅地址可在 Google 日历「通过网址添加」中使用。</p>
    </div>
  );
}

export function GoogleLink({ title, start, end, details, location }: { title: string; start: string; end: string; details: string; location: string }) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(start)}/${f(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  return <a href={href} target="_blank" rel="noreferrer" className={s.gLink}>Google 日历</a>;
}
