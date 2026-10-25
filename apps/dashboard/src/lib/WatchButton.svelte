<script lang="ts">
  import { Bell, BellOff } from '@lucide/svelte';
  let {
    type,
    id,
    language = 'en'
  }: { type: 'item' | 'thread'; id: string; language?: 'pl' | 'en' } = $props();
  let watching = $state(false),
    busy = $state(true),
    error = $state('');
  const path = $derived(`/api/notifications/subscriptions/${type}/${encodeURIComponent(id)}`);
  $effect(() => {
    const controller = new AbortController();
    busy = true;
    error = '';
    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load subscription');
        const result = await response.json();
        if (!controller.signal.aborted) watching = result.watching;
      })
      .catch((cause) => {
        if (!controller.signal.aborted) error = cause.message;
      })
      .finally(() => {
        if (!controller.signal.aborted) busy = false;
      });
    return () => controller.abort();
  });
  async function toggle() {
    busy = true;
    error = '';
    try {
      const response = await fetch(path, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ watching: !watching })
      });
      if (!response.ok) throw new Error('Unable to change subscription');
      watching = (await response.json()).watching;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<button
  type="button"
  class="watch-button"
  aria-pressed={watching}
  aria-label={watching
    ? language === 'pl'
      ? 'Przestań obserwować'
      : 'Unwatch'
    : language === 'pl'
      ? 'Obserwuj'
      : 'Watch'}
  disabled={busy}
  onclick={toggle}
>
  {#if busy}<span class="sr-only">{language === 'pl' ? 'Ładowanie…' : 'Loading…'}</span>
  {:else if watching}<Bell size={14} aria-hidden="true" />
  {:else}<BellOff size={14} aria-hidden="true" />
  {/if}
</button>
{#if error}<p role="alert">{error}</p>{/if}

<style>
  .watch-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background 0.13s,
      border-color 0.13s,
      color 0.13s;
  }
  .watch-button:hover {
    border-color: var(--control-border-hover);
    color: var(--ink);
    background: var(--surface-muted);
  }
  .watch-button[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--surface-muted);
  }
  .watch-button[aria-pressed='true']:hover {
    background: var(--accent);
    color: var(--primary-text);
    border-color: var(--accent);
  }
  .watch-button:disabled {
    opacity: 0.5;
    cursor: wait;
    pointer-events: none;
  }
</style>
