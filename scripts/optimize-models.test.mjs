import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const script = resolve(scriptsDir, 'optimize-models.mjs');
const node = process.execPath;

function run(...args) {
  return spawnSync(node, [script, ...args], { encoding: 'utf8' });
}

test('dry-run maps a food and sample to four flat source and mobile paths', () => {
  const result = run('--food', 'taco', '--sample', '--dry-run');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /public[\\/]models[\\/]taco-0\.glb/);
  assert.match(result.stdout, /public[\\/]models-mobile[\\/]taco-0\.glb/);
  assert.doesNotMatch(result.stdout, /taco-[123]\.glb/);
  assert.match(result.stdout, /--compress meshopt/);
});

test('dry-run defaults to burger and includes all four stages', () => {
  const result = run('--dry-run');

  assert.equal(result.status, 0, result.stderr);
  for (let index = 0; index < 4; index += 1) {
    assert.match(result.stdout, new RegExp(`burger-${index}\\.glb`));
  }
});

test('rejects a food id that can escape the model directories', () => {
  const result = run('--food', '../escape', '--dry-run');

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /safe|invalid|food id/i);
});
