// @ts-check
import { adapter as svelte } from '@wuchale/svelte';
import { defineConfig } from 'wuchale';

export default defineConfig({
  locales: ['en', 'pl'],
  adapters: {
    main: svelte({ loader: 'svelte' })
  }
});
