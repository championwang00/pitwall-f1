import path from "node:path";

type Row = Record<string, any>;
type Stmt = { all: (...p: unknown[]) => Row[]; get: (...p: unknown[]) => Row | undefined };

let _db: { prepare: (sql: string) => Stmt } | null = null;
const stmts = new Map<string, Stmt>();

function open() {
  if (!_db) {
    // node:sqlite prints an ExperimentalWarning that Next forwards to the browser console; silence just that one.
    const emit = process.emitWarning;
    (process as any).emitWarning = (w: any, ...rest: any[]) => {
      if (String(w).includes("SQLite")) return;
      return (emit as any).call(process, w, ...rest);
    };
    // getBuiltinModule keeps the bundler from trying to resolve node:sqlite
    const { DatabaseSync } = (process as any).getBuiltinModule("node:sqlite");
    _db = new DatabaseSync(path.join(process.cwd(), "data/f1db.db"), { readOnly: true });
  }
  return _db!;
}

function stmt(sql: string) {
  let s = stmts.get(sql);
  if (!s) {
    s = open().prepare(sql);
    stmts.set(sql, s);
  }
  return s;
}

// node:sqlite returns null-prototype rows; spread them so they can cross the RSC boundary.
export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return stmt(sql).all(...params).map((r) => ({ ...r })) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  const r = stmt(sql).get(...params);
  return r ? ({ ...r } as T) : undefined;
}
