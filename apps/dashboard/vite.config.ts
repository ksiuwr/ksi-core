import { execSync } from 'node:child_process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { wuchale } from 'wuchale/vite';
import manifest from '../../package.json';
let commit = process.env.PUBLIC_COMMIT_HASH || process.env.GITHUB_SHA || '';
if (!commit) {
  try {
    commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {}
}
export default defineConfig({
  envDir: '../..',
  plugins: [wuchale(), sveltekit()],
  define: {
    'import.meta.env.PUBLIC_COMMIT_HASH': JSON.stringify(commit),
    'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(manifest.version)
  }
});
