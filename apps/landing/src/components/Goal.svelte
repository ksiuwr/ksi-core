<script lang="ts">
  import type { Snippet } from 'svelte';
  import { FlaskConical, CodeXml, Share2 } from '@lucide/svelte';

  let {
    type,
    children
  }: {
    type: 'scientific' | 'technical' | 'social';
    children: Snippet;
  } = $props();

  const config = {
    scientific: {
      colorClass: 'border-accent bg-accent/5 text-accent',
      // @wc-include
      label: '// Scientifically',
      icon: FlaskConical
    },
    technical: {
      colorClass: 'border-secondary bg-secondary/5 text-secondary',
      // @wc-include
      label: '// Technically',
      icon: CodeXml
    },
    social: {
      colorClass: 'border-primary bg-primary/5 text-primary',
      // @wc-include
      label: '// Socially',
      icon: Share2
    }
  };

  const current = $derived(config[type]);
</script>

<div class={`flex w-full gap-4 rounded-r-md border-l-2 p-4 ${current.colorClass}`}>
  <div class="mt-1 shrink-0">
    {#if current}
      {@const Icon = current.icon}
      <Icon class="size-5" />
    {/if}
  </div>
  <div class="flex w-full flex-col">
    <span class="mb-1 font-mono text-xs font-bold tracking-wider uppercase opacity-90">
      {current.label}
    </span>
    <div class="text-base-content/90 leading-relaxed">
      {@render children()}
    </div>
  </div>
</div>
