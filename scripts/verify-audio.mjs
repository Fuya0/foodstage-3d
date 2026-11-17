// Self-contained check: uses only this repository, Node built-ins and shipped audio.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'src/data/eating-audio.json'), 'utf8'));
const publicRoot = resolve(root, 'public');
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
let count = 0;
for (const [dish, stages] of Object.entries(manifest)) {
  if (stages.length !== 4) throw Error(`${dish}: expected four stages`);
  for (const files of stages) for (const url of Object.values(files)) {
    if (!url.startsWith('/audio/') || url.includes('..') || url.includes('\\')) throw Error(`Nonlocal audio: ${url}`);
    const file = resolve(publicRoot, url.slice(1));
    if (!relative(publicRoot, file).startsWith(`audio${sep}`) || !existsSync(file)) throw Error(`Missing local audio: ${url}`);
    const record = JSON.parse(readFileSync(resolve(dirname(file), '../manifest.json'), 'utf8'));
    const clip = record.clips.find(clip => clip.url === url);
    if (!clip || sha(file) !== clip.sha256) throw Error(`Changed audio without updated provenance: ${url}`);
    count++;
  }
}
let packaged = 0;
if (process.argv.includes('--dist')) {
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(mp3|wav|ogg)$/i.test(entry.name)) {
        const bundled = resolve(root, 'dist', relative(publicRoot, path));
        if (!existsSync(bundled) || sha(path) !== sha(bundled)) throw Error(`Build missing/stale audio: ${bundled}`);
        packaged++;
      }
    }
  }
  walk(resolve(publicRoot, 'audio'));
}
console.log(JSON.stringify({ project: root, mappedClips: count, packagedAudioFiles: packaged,
  outsideProjectDependencies: 0, status: 'passed' }));
