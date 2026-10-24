<script lang="ts">
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
  class="btn btn-outline"
  aria-pressed={watching}
  disabled={busy}
  onclick={toggle}
  >{watching
    ? language === 'pl'
      ? 'Przestań obserwować'
      : 'Unwatch'
    : language === 'pl'
      ? 'Obserwuj'
      : 'Watch'}</button
>
{#if error}<p role="alert">{error}</p>{/if}
