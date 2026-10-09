"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /live#timing (old ▶ links): /live has no timing panel outside a live session any more → the year hub's 回放 tab (v5 §0.5.5). */
export default function TimingHashRedirect({ year }: { year: number }) {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === "#timing" && !document.getElementById("timing")) router.replace(`/seasons/${year}/replay`);
  }, [router, year]);
  return null;
}
