#!/usr/bin/env bun
// Generate PNG icons for the Sudoku PWA from an inline SVG source.
// Outputs to deploy/sudoku/.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const OUT = resolve(ROOT, "deploy/sudoku");

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#172421"/>
  <rect x="80" y="80" width="352" height="352" rx="40" fill="#fbfaf5"/>
  <text x="256" y="362" font-family="Georgia, Times New Roman, serif" font-size="320" font-weight="700" fill="#ea580c" text-anchor="middle">9</text>
</svg>
`.trim();

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

await mkdir(OUT, { recursive: true });

await Promise.all(
  targets.map(async ({ name, size }) => {
    const buf = await sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer();
    const path = resolve(OUT, name);
    await writeFile(path, buf);
    console.log(`✓ ${path} (${size}x${size}, ${buf.length} bytes)`);
  }),
);
