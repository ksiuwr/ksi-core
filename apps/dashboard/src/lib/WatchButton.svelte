<script lang="ts">
  import { Bell, BellOff } from '@lucide/svelte';
  let {
    type,
    id,
    showLabel = false
  }: {
    type: 'item' | 'thread';
    id: string;
    showLabel?: boolean;
  } = $props();
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
        if (!response.ok) throw new Error('Nie udało się wczytać subskrypcji');
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
      if (!response.ok) throw new Error('Nie udało się zmienić subskrypcji');
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
  class:with-label={showLabel}
  aria-pressed={watching}
  aria-label={watching ? 'Przestań obserwować' : 'Obserwuj'}
  disabled={busy}
  onclick={toggle}
>
  {#if busy}<span class="sr-only">Wczytywanie…</span>
  {:else if watching}<BellOff size={13} aria-hidden="true" />
  {:else}<Bell size={13} aria-hidden="true" />
  {/if}
  {#if showLabel}
    <span class="watch-label"
      >{#if watching}Przestań obserwować{:else}Obserwuj{/if}</span
    >
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
    border: 1px solid var(--input);
    border-radius: var(--radius-md);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
    color: var(--muted);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      background-color var(--dur-fast) ease,
      color var(--dur-fast) ease;
  }
  .watch-button:hover {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .watch-button.with-label {
    width: auto;
    height: 32px;
    padding: 0 12px;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 500;
  }
  .watch-label {
    white-space: nowrap;
  }
  .watch-button[aria-pressed='true'] {
    color: var(--ink);
  }
  .watch-button:disabled {
    opacity: 0.5;
    cursor: wait;
    pointer-events: none;
  }
</style>
