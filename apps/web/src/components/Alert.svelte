<script lang="ts">
  import type { api } from '$lib/backend';
  import { ArrowUpRight, Info, Megaphone, OctagonAlert, TriangleAlert } from '@lucide/svelte';

  let {
    alert
  }: {
    alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;
  } = $props();

  const color = $derived(alert.color ?? 'neutral');
  const Icon = $derived(
    { neutral: Megaphone, info: Info, warning: TriangleAlert, danger: OctagonAlert }[color]
  );
</script>

{#snippet content()}
  <Icon class="alert-icon size-4 shrink-0" aria-hidden="true" />
  <p class="min-w-0 flex-1 leading-snug wrap-anywhere">
    <strong class="font-semibold">{alert.title}</strong>
    {#if alert.description}{' '}<span class="text-muted">{alert.description}</span>{/if}
  </p>
  {#if alert.link}
    <ArrowUpRight
      class="text-muted size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      aria-hidden="true"
    />
  {/if}
{/snippet}

<div class="site-alert" data-color={color}>
  {#if alert.link}
    <a
      href={alert.link}
      target="_blank"
      rel="noopener noreferrer"
      class="page-container group text-ink flex items-center gap-3 py-2.5 text-[13px]"
    >
      {@render content()}
    </a>
  {:else}
    <div class="page-container text-ink flex items-center gap-3 py-2.5 text-[13px]" role="status">
      {@render content()}
    </div>
  {/if}
</div>

<style>
  .site-alert {
    --alert-tone: var(--muted);
    border-bottom: 1px solid color-mix(in oklch, var(--alert-tone) 26%, var(--line));
    background: color-mix(in oklch, var(--alert-tone) 9%, var(--paper));
  }
  .site-alert[data-color='info'] {
    --alert-tone: oklch(0.58 0.14 250);
  }
  .site-alert[data-color='warning'] {
    --alert-tone: oklch(0.68 0.14 70);
  }
  .site-alert[data-color='danger'] {
    --alert-tone: var(--danger);
  }
  :global([data-theme='dark']) .site-alert[data-color='info'] {
    --alert-tone: oklch(0.74 0.12 250);
  }
  :global([data-theme='dark']) .site-alert[data-color='warning'] {
    --alert-tone: oklch(0.8 0.13 80);
  }
  .site-alert :global(.alert-icon) {
    color: var(--alert-tone);
  }
</style>
