<script lang="ts">
  import { Bell, BellOff } from '@lucide/svelte';
  import { Text, ToggleButton } from '@astryx-sv/core';

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

{#snippet bellIcon()}<Bell size={15} aria-hidden="true" />{/snippet}
{#snippet bellOffIcon()}<BellOff size={15} aria-hidden="true" />{/snippet}

<ToggleButton
  label={watching ? 'Przestań obserwować' : 'Obserwuj'}
  tooltip={watching ? 'Przestań obserwować' : 'Obserwuj'}
  isPressed={watching}
  isIconOnly={!showLabel}
  isLoading={busy}
  isDisabled={busy}
  icon={bellIcon}
  pressedIcon={bellOffIcon}
  onPressedChange={() => void toggle()}
/>
{#if error}<Text role="alert" class="error-text">{error}</Text>{/if}

<style>
  :global(.error-text) {
    color: var(--color-error);
  }
</style>
