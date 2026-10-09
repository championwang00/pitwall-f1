"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** `units="en"`: formula1.com's countdown — "04H 47M 17S" (digits / unit letters styled by numClassName / unitClassName). */
export default function Countdown({ to, className, unitClassName, numClassName, units = "zh" }: { to: string; className?: string; unitClassName?: string; numClassName?: string; units?: "zh" | "en" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = parts(new Date(to).getTime() - (now ?? new Date(to).getTime()));
  const pad = (n: number) => String(n).padStart(2, "0");
  if (units === "en") {
    const seg = (v: string, u: string) => <><b className={numClassName}>{v}</b><i className={unitClassName}>{u}</i></>;
    return (
      <span className={className} suppressHydrationWarning>
        {p.d > 0 && seg(pad(p.d), "D")}{seg(pad(p.h), "H")}{seg(pad(p.m), "M")}{seg(pad(p.s), "S")}
      </span>
    );
  }
  return (
    <span className={className} suppressHydrationWarning>
      {p.d > 0 && (<>{p.d}<i className={unitClassName}>天</i></>)}
      {pad(p.h)}<i className={unitClassName}>时</i>{pad(p.m)}<i className={unitClassName}>分</i>{pad(p.s)}<i className={unitClassName}>秒</i>
    </span>
  );
}
