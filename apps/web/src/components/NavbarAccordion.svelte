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
  <div class="flex w-max cursor-default items-center gap-2">
    <X
      strokeWidth={5}
      class="inline-block size-5 scale-50 rotate-45 transition-transform duration-300 group-hover:scale-100 group-hover:rotate-0"
    />
    <p class="mr-4 text-3xl font-bold uppercase">{title}</p>
    {#if url}
      <!-- @wc-include -->
      <a href={url} class="cursor-pointer self-end underline">{urlText ?? 'details'}</a>
    {/if}
  </div>

  {#if content}
    <div
      class="rounded-box left-0 mt-2 h-0 w-full overflow-hidden transition-all duration-700 ease-in-out group-hover:h-48"
    >
      {@render content()}
    </div>
  {/if}
</div>
