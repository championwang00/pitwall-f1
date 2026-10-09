"use client";

import { useEffect, useState } from "react";
import s from "./shell.module.css";
import CommandK from "./CommandK";
import Icon from "@/components/ui/Icon";

export default function SearchButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button className={s.search} onClick={() => setOpen(true)} aria-label="搜索">
        <Icon name="search" size={20} />
        <span>搜索</span>
      </button>
      {open && <CommandK onClose={() => setOpen(false)} />}
    </>
  );
}
