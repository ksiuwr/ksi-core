import { defaultFrontendLocale } from 'shared/content-locales';
import type { LayoutLoad } from './$types';
import { loadLocale } from 'wuchale/load-utils';
import '../locales/main.loader.svelte.js';

// Load the default catalog before the first render so server-rendered copy and
// component labels are present on first paint. The layout switches to the
// visitor's preferred locale after hydration.
export const load: LayoutLoad = async ({ data }) => {
  await loadLocale(defaultFrontendLocale);
  return data;
};
