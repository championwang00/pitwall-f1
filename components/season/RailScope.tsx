"use client";

import { useEffect } from "react";
import { setScope, type Scope } from "./railStore";

/** Drop this into a page to tell the global year rail which years exist for the subject and where each year leads. */
export default function RailScope(props: Scope) {
  const key = JSON.stringify(props);
  useEffect(() => {
    setScope(props);
    return () => setScope({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
