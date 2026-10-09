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
    materialize(_db as any);
  }
  return _db!;
}

/**
 * F1DB's result tables (race_result, fastest_lap, qualifying_result …) are VIEWS over race_data, so every
 * "this driver's results" lookup scanned it without an index (one correlated query took 24 s). On open we copy the
 * hot views into indexed TEMP tables of the same name; SQLite resolves temp first, so every existing query speeds up
 * unchanged (24 s → 1 ms). The file itself stays read-only. ~0.3 s once per server start.
 */
function materialize(db: { exec: (sql: string) => void }) {
  const views: [string, string[]][] = [
    ["race_result", ["driver_id, race_id", "race_id, position_number", "constructor_id, race_id", "race_id, driver_id"]],
    ["qualifying_result", ["race_id, position_number", "driver_id, race_id"]],
    ["sprint_race_result", ["race_id, position_number", "driver_id, race_id"]],
    ["starting_grid_position", ["race_id, position_number", "driver_id, race_id"]],
    ["fastest_lap", ["race_id, position_number", "driver_id, race_id"]],
    ["pit_stop", ["race_id", "driver_id, race_id"]],
    ["driver_of_the_day_result", ["race_id"]],
  ];
  const t = Date.now();
  for (const [v, idx] of views) {
    try {
      db.exec(`CREATE TEMP TABLE ${v} AS SELECT * FROM main.${v}`);
      idx.forEach((cols, i) => db.exec(`CREATE INDEX temp.${v}_i${i} ON ${v}(${cols})`));
    } catch { /* view missing in an older F1DB: keep using the view */ }
  }
  if (process.env.NODE_ENV !== "production") console.log(`[db] materialized result views in ${Date.now() - t} ms`);
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
