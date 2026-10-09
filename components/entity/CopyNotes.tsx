"use client";

import { useState } from "react";
import s from "./talk.module.css";

export default function CopyNotes({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className={s.copy} onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); }}>
      {done ? "已复制" : "复制全部"}
    </button>
  );
}
