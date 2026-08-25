<script lang="ts">
  import { ChevronDown, RefreshCw, TableProperties } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { api } from '$lib/backend';
  import { toast } from 'svelte-sonner';

  type CachedMap = NonNullable<Awaited<ReturnType<typeof api.dashboard.admin.s3cache.get>>['data']>;

  let cachedMap = $state<CachedMap | null>(null);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let refreshingKeys = $state<string[]>([]);

  let cacheEntries = $derived(
    cachedMap ? Object.entries(cachedMap).sort(([left], [right]) => left.localeCompare(right)) : []
  );

  $effect(() => {
    void fetchCache();
  });

  function resolveCacheError(error: { value: unknown }) {
    if (typeof error.value === 'string') return error.value;
    if (
      typeof error.value === 'object' &&
      error.value !== null &&
      'message' in error.value &&
      typeof error.value.message === 'string'
    ) {
      return error.value.message;
    }
    return 'An unknown error occurred.';
  }

  async function fetchCache(showLoading = true) {
    if (showLoading) loading = true;
    loadError = null;
    const response = await api.dashboard.admin.s3cache.get();

    if (response.error) {
      loadError = resolveCacheError(response.error);
      toast.error(loadError);
      loading = false;
      return;
    }

    cachedMap = response.data;
    loading = false;
  }

  async function refetch(key: string) {
    if (refreshingKeys.includes(key)) return;
    refreshingKeys = [...refreshingKeys, key];

    const response = await api.dashboard.admin.s3cache({ id: key }).post();
    if (response.error) {
      toast.error(resolveCacheError(response.error));
      refreshingKeys = refreshingKeys.filter((item) => item !== key);
      return;
    }

    await fetchCache(false);
    refreshingKeys = refreshingKeys.filter((item) => item !== key);
    toast.success(`Refreshed cache key “${key}”`);
  }

  function formatLocalDate(date: Date | number | string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  }
</script>

{#snippet icon()}
  <TableProperties class="size-4" />
{/snippet}

<Wrapper name="dashboard / s3 cache" {icon}>
  <header class="border-base-content/15 border-b pb-10 md:pb-14">
    <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">Storage operations</p>
    <h1 class="mb-0! text-4xl tracking-[-0.04em] sm:text-5xl">S3 cache</h1>
    <p class="text-base-content/65 mt-4 max-w-3xl text-lg leading-relaxed">
      The website caches lists of object URLs from Cloudflare R2 to avoid repeatedly scanning
      storage. Inspect each cached group below or refresh a key after its bucket contents change.
    </p>
  </header>

  <section class="py-10 md:py-14" aria-labelledby="cache-list-heading" aria-busy={loading}>
    <div class="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
          01 / Cached groups
        </p>
        <h2 id="cache-list-heading" class="mb-0! text-2xl tracking-tight sm:text-3xl">
          Object listings
        </h2>
      </div>
      {#if !loading && !loadError}
        <span class="text-base-content/45 font-mono text-xs">
          {cacheEntries.length}
          {cacheEntries.length === 1 ? 'key' : 'keys'} cached
        </span>
      {/if}
    </div>

    {#if loading}
      <div class="border-base-content/15 border p-8 text-center" role="status">
        <p class="text-base-content/55 font-mono text-sm">Loading cached object listings…</p>
      </div>
    {:else if loadError}
      <div class="border-error/30 bg-error/5 border p-6">
        <p class="text-error font-bold">The S3 cache could not be loaded.</p>
        <p class="text-base-content/65 mt-1 text-sm">{loadError}</p>
        <button class="btn btn-outline btn-sm mt-4" type="button" onclick={() => void fetchCache()}>
          Try again
        </button>
      </div>
    {:else if cacheEntries.length === 0}
      <div class="border-base-content/25 border border-dashed px-6 py-14 text-center">
        <TableProperties class="text-base-content/30 mx-auto mb-4 size-8" strokeWidth={1.5} />
        <h3 class="mb-2! text-xl">No cache keys found</h3>
        <p class="text-base-content/55">
          Cached object listings will appear here after they are used.
        </p>
      </div>
    {:else}
      <div class="grid gap-5 lg:grid-cols-2">
        {#each cacheEntries as [key, cache] (key)}
          {@const refreshing = refreshingKeys.includes(key)}
          <article class="border-base-content/20 bg-base-100 flex min-w-0 flex-col border">
            <div class="border-base-content/15 border-b p-5 md:p-6">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <p
                    class="text-base-content/40 mb-2 font-mono text-xs tracking-[0.16em] uppercase"
                  >
                    Cache key
                  </p>
                  <h3 class="mb-2! text-xl tracking-tight wrap-anywhere">{key}</h3>
                  <p class="text-base-content/50 font-mono text-xs">
                    Updated {formatLocalDate(cache.time)}
                  </p>
                </div>
                <button
                  class="btn btn-outline btn-sm shrink-0 gap-2"
                  type="button"
                  onclick={() => void refetch(key)}
                  disabled={refreshing}
                  aria-label={`Refresh cache key ${key}`}
                >
                  <RefreshCw class="size-4" />
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            <details class="group/details flex-1">
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-4 p-5 md:px-6"
              >
                <span class="font-mono text-xs font-bold tracking-[0.14em] uppercase">
                  {cache.data.length}
                  {cache.data.length === 1 ? 'object URL' : 'object URLs'}
                </span>
                <ChevronDown class="size-4 shrink-0 group-open/details:rotate-180" />
              </summary>
              <ul class="border-base-content/15 bg-base-200/35 border-t p-5 md:p-6">
                {#each [...cache.data].sort((left, right) => left.localeCompare(right)) as url}
                  <li
                    class="border-base-content/10 border-b py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="link link-primary block font-mono text-xs leading-relaxed break-all"
                      >{url}</a
                    >
                  </li>
                {:else}
                  <li class="text-base-content/50 font-mono text-xs">
                    This cache key contains no URLs.
                  </li>
                {/each}
              </ul>
            </details>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</Wrapper>
