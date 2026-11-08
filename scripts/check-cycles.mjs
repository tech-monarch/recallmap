// Fails if any import cycle exists under src/ or worker/. No dependencies: a small DFS over relative imports.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["src", "worker"];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx|mts)$/.test(name)) files.push(path.resolve(full));
  }
};
for (const r of roots) walk(r);

const known = new Set(files);
const resolveImport = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, path.join(base, "index.ts")]) if (known.has(cand)) return cand;
  return null;
};
const graph = new Map();
const importRe = /(?:import|export)\s[^'"]*?from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const deps = new Set();
  for (const m of src.matchAll(importRe)) {
    const target = resolveImport(f, m[1] ?? m[2]);
    if (target) deps.add(target);
  }
  graph.set(f, [...deps]);
}

const state = new Map();
const stack = [];
let cycle = null;
const visit = (n) => {
  if (cycle) return;
  state.set(n, 1);
  stack.push(n);
  for (const d of graph.get(n) ?? []) {
    if (state.get(d) === 1) {
      cycle = [...stack.slice(stack.indexOf(d)), d];
      return;
    }
    if (!state.has(d)) visit(d);
  }
  stack.pop();
  state.set(n, 2);
};
for (const f of files) if (!state.has(f)) visit(f);

if (cycle) {
  console.error("Import cycle detected:\n  " + cycle.map((f) => path.relative(process.cwd(), f)).join("\n  -> "));
  process.exit(1);
}
console.log(`No import cycles in ${files.length} files.`);
