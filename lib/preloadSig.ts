/** What the first-visit loader last prepared (its session keys): the logo link re-runs the loader only when this changes. */
export const PRELOAD_SIG = "pitwall-preload-sig";
export const planSig = (sessions: { session_key: number }[]) => sessions.map((x) => x.session_key).join(",");
