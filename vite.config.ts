import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/** Publish registered models and official static directories without local asset archives. */
function runtimePublicAssets(): Plugin {
  let root: string;
  return {
    name: 'runtime-public-assets',
    apply: 'build',
    configResolved(config) { root = config.root; },
    generateBundle() {
      const inside = (directory: string, path: string) => {
        const offset = relative(directory, path);
        if (offset === '..' || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
          throw new Error(`Static asset escapes its runtime directory: ${path}`);
        }
      };
      const projectRoot = realpathSync(root);
      const publicRoot = realpathSync(resolve(root, 'public'));
      inside(projectRoot, publicRoot);
      const emitted = new Set<string>();
      const emit = (path: string, fileName: string, directory: string) => {
        const source = realpathSync(path);
        inside(directory, source);
        if (!statSync(source).isFile()) throw new Error(`Missing runtime asset: ${path}`);
        if (emitted.has(fileName)) throw new Error(`Duplicate runtime asset: ${fileName}`);
        emitted.add(fileName);
        this.emitFile({ type: 'asset', fileName, source: readFileSync(source) });
      };
      const manifest = JSON.parse(readFileSync(resolve(root, 'assets/manifest.json'), 'utf8'));
      if (manifest.schemaVersion !== 1 || !manifest.runtimeRoots ||
          Object.keys(manifest.runtimeRoots).length !== 1 ||
          manifest.runtimeRoots.unified !== 'public/models-runtime') {
        throw new Error('Final manifest must declare only the unified runtime root');
      }
      if (!Array.isArray(manifest.runtimeFiles) || manifest.runtimeFiles.length === 0) {
        throw new Error('Final manifest must declare runtimeFiles before production build');
      }
      for (const item of manifest.runtimeFiles) {
        if (!item || typeof item.path !== 'string' || !/^public\/models-runtime\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]+\.glb$/.test(item.path)) {
          throw new Error(`Unsafe runtime model path: ${item?.path}`);
        }
        const directory = realpathSync(resolve(root, item.path.split('/').slice(0, 2).join('/')));
        inside(publicRoot, directory);
        emit(resolve(root, item.path), item.path.slice('public/'.length), directory);
      }
      for (const name of ['foods', 'audio']) {
        const directory = realpathSync(resolve(publicRoot, name));
        inside(publicRoot, directory);
        const visit = (current: string, prefix: string, ancestors: Set<string>) => {
          const canonical = realpathSync(current);
          inside(directory, canonical);
          if (ancestors.has(canonical)) throw new Error(`Cyclic static asset directory: ${current}`);
          const next = new Set([...ancestors, canonical]);
          for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const path = resolve(current, entry.name);
            const fileName = `${prefix}/${entry.name}`;
            if (statSync(path).isDirectory()) visit(path, fileName, next);
            else emit(path, fileName, directory);
          }
        };
        visit(directory, name, new Set());
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), runtimePublicAssets()],
  build: { copyPublicDir: false },
  server: { watch: { ignored: ['**/*.tmpdir/**'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/pizza-scale.test.ts'],
  },
});
