import adapterNode from '@sveltejs/adapter-node';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const getAdapter = () => {
  if (process.env.ADAPTER === 'cloudflare') {
    return adapterCloudflare();
  }
  return adapterNode();
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: getAdapter()
  }
};

export default config;
