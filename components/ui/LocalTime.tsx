"use client";

import { useEffect, useState } from "react";

/** Renders an ISO instant in the viewer's own timezone (falls back to UTC+8 on the server). */
/** `lang="en"`: formula1.com style ("Fri", "09 Oct"). */
export default function LocalTime({ iso, format = "time", className, lang = "zh" }: { iso: string; format?: "time" | "date" | "datetime" | "weekday"; className?: string; lang?: "zh" | "en" }) {
  const [tz, setTz] = useState<string | undefined>("Asia/Shanghai");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    format === "time" ? { hour: "2-digit", minute: "2-digit", hour12: false }
    : format === "date" ? (lang === "en" ? { month: "short", day: "2-digit" } : { month: "2-digit", day: "2-digit" })
    : format === "weekday" ? { weekday: "short" }
    : { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false };
  return <time dateTime={iso} className={className} suppressHydrationWarning>{(lang === "en" ? d.toLocaleString("en-GB", { ...opts, timeZone: tz }) : d.toLocaleString("zh-CN", { ...opts, timeZone: tz }))}</time>;
}
