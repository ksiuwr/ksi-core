<script lang="ts">
  import { ImageOff, LoaderCircle } from '@lucide/svelte';
  import { preferences } from './preferences.svelte.js';
  let { src, alt = '' }: { src: string; alt?: string } = $props();
  const language = $derived(preferences.language);
  let ready = $state(false);
  let failed = $state(false);
  $effect(() => {
    ready = false;
    failed = !src;
  });
</script>

<div class="gallery-image" aria-busy={!ready && !failed}>
  <img
    {src}
    {alt}
    draggable="false"
    class:ready
    onload={() => (ready = true)}
    onerror={() => (failed = true)}
  />
  {#if !ready || failed}<span class="image-status" role="status">
      {#if failed}<ImageOff size={22} aria-hidden="true" />{language === 'pl'
          ? 'Obraz niedostępny'
          : 'Image unavailable'}
      {:else}<span class="spinner"><LoaderCircle size={22} aria-hidden="true" /></span>{language ===
        'pl'
          ? 'Ładowanie zdjęcia…'
          : 'Loading image…'}{/if}
    </span>{/if}
</div>

<style>
  .gallery-image {
    position: relative;
    width: 100%;
    aspect-ratio: 1.3;
    background: var(--surface-muted);
  }
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
  }
  img.ready {
    opacity: 1;
  }
  .image-status {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
  .spinner {
    display: inline-flex;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
