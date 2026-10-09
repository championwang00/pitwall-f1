// Module hooks so offline scripts can import the app's own lib/*.ts (same logic as the pages, no copy):
// node --experimental-strip-types --import ./scripts/lib/ts-register.mjs scripts/<x>.mjs
// · "@/x" → <project>/x · extensionless relative imports → .ts / .tsx / index.ts · *.json → default export
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tryFile = (p) => {
  for (const ext of ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts"]) { const f = p + ext; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  return null;
};
export async function resolve(spec, ctx, next) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
  if (base) { const f = tryFile(base); if (f) return { url: pathToFileURL(f).href, shortCircuit: true }; }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith("file:") && url.endsWith(".json")) {
    return { format: "module", source: `export default ${fs.readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
  }
  if (url.startsWith("file:") && url.endsWith(".ts")) {
    return next(url, { ...ctx, format: "module-typescript" });
  }
  return next(url, ctx);
}
