<script lang="ts">
  import type { api } from '$lib/backend';
  import { ArrowUpRight } from '@lucide/svelte';
  import { Banner, Button } from '@astryx-sv/core';

  let {
    alert
  }: {
    alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;
  } = $props();

  const status = $derived(
    alert.color === 'danger'
      ? 'error'
      : alert.color === 'warning'
        ? 'warning'
        : alert.color === 'info'
          ? 'info'
          : 'info'
  );
</script>

<Banner
  {status}
  title={alert.title}
  description={alert.description ?? undefined}
  container="section"
  collapsible={false}
>
  {#snippet endContent()}
    {#if alert.link}
      <Button
        href={alert.link}
        variant="ghost"
        size="sm"
        label="Więcej"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ArrowUpRight class="size-4" aria-hidden="true" />
      </Button>
    {/if}
  {/snippet}
</Banner>
