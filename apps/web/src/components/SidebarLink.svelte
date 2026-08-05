<script lang="ts">
  import { page } from '$app/stores';
  import { cn } from '$lib/utils';
  import type { Component } from 'svelte';

  let {
    href,
    icon: Icon,
    children,
    exact = true
  }: {
    href: string;
    icon?: Component<any>;
    children?: any;
    exact?: boolean;
  } = $props();
</script>

<a {href} class="btn btn-lg btn-outline gap-4">
  {#if Icon}
    <Icon class="size-4" />
  {/if}
  <span>
    {@render children?.()}
  </span>
</a>
