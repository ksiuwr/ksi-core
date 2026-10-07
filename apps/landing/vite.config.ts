import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { wuchale } from 'wuchale/vite';

function getCommitHash() {
  const envHash =
    process.env.PUBLIC_COMMIT_HASH ||
    process.env.PUBLIC_GITHUB_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.COMMIT_REF;
  if (envHash) return envHash;

  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const commitHash = getCommitHash();
process.env.PUBLIC_COMMIT_HASH = commitHash;

export default defineConfig({
  plugins: [wuchale(), tailwindcss(), sveltekit()],
  define: {
    'import.meta.env.PUBLIC_COMMIT_HASH': JSON.stringify(commitHash)
  },
  ssr: {
    noExternal: ['@lucide/svelte']
  }
});
