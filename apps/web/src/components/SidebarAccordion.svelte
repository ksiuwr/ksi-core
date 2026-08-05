<script lang="ts">
  import { ChevronRight, Folder } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  let {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();

  let expanded = $state(false);
</script>

<div class="flex flex-col px-2 py-4 gap-2 select-none">
  <b class="text-xl"> {title} </b>

  {@render children()}
</div>
