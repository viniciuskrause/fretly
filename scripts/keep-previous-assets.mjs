#!/usr/bin/env node
// Copies into dist/ the assets the live (previous) deploy still uses, so a browser
// holding a cached page from before the deploy (GitHub Pages caches HTML for
// 10 minutes) doesn't request deleted JS/CSS and show a broken page.
// Only one generation is kept: what the previous pages reference, followed
// through their JS imports — older leftovers are dropped.
//
//   node scripts/keep-previous-assets.mjs <previous gh-pages checkout> <dist>
import fs from "node:fs";
import path from "node:path";

const [previous, dist] = process.argv.slice(2);
const ASSET = /[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.(?:js|css)/g;

const htmlFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "assets") return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith(".html") ? [full] : [];
  });

const queue = htmlFiles(previous).flatMap((file) => fs.readFileSync(file, "utf8").match(ASSET) ?? []);
const kept = new Set();
while (queue.length) {
  const name = queue.pop();
  const source = path.join(previous, "assets", name);
  if (kept.has(name) || !fs.existsSync(source)) continue;
  kept.add(name);
  const target = path.join(dist, "assets", name);
  if (!fs.existsSync(target)) fs.copyFileSync(source, target);
  if (name.endsWith(".js")) queue.push(...(fs.readFileSync(source, "utf8").match(ASSET) ?? []));
}
console.log(`assets da versão anterior mantidos: ${kept.size}`);
