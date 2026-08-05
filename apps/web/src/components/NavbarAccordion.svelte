<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  let {
    title,
    url,
    urlText,
    content
  }: {
    title: string;
    url?: string;
    urlText?: string;
    content?: Snippet;
  } = $props();
</script>

<div class="group relative">
  <div class="flex items-center gap-2 w-max cursor-default">
    <X
      strokeWidth={5}
      class="size-5 inline-block rotate-45 group-hover:rotate-0 scale-50 group-hover:scale-100 transition-transform duration-300"
    />
    <p class="text-3xl font-bold uppercase mr-4">{title}</p>
    {#if url}
      <!-- @wc-include -->
      <a href={url} class="self-end underline cursor-pointer">{urlText ?? 'details'}</a>
    {/if}
  </div>

  {#if content}
    <div
      class="left-0 mt-2 overflow-hidden w-full h-0 group-hover:h-48 transition-all duration-700 ease-in-out rounded-box"
    >
      {@render content()}
    </div>
  {/if}
</div>
