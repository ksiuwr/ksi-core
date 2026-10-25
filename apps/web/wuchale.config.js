import { frontendLocales } from '../../packages/shared/content-locales.ts';
// @ts-check
import { adapter as svelte } from '@wuchale/svelte';
import { defineConfig } from 'wuchale';

export default defineConfig({
  locales: [...frontendLocales],
  adapters: {
    main: svelte({
      loader: 'svelte',
      files: [
        'src/**/*.svelte',
        'src/**/*.svelte.{js,ts}',
        '../../packages/ui/src/lib/platform/Markdown.svelte'
      ]
    })
  }
});
