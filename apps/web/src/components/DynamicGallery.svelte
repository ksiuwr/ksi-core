<script lang="ts">
  import { api, resolveError } from '$lib/backend';
  import { Images, RotateCcw } from '@lucide/svelte';
  import Gallery from './Gallery.svelte';
  import type { Snippet } from 'svelte';

  let { id, empty }: { id: string; empty?: Snippet } = $props();

  let loading = $state(true);
  let images = $state<string[]>([]);
  let errorMessage = $state('');
  let request = 0;

  async function loadImages(galleryId: string) {
    const currentRequest = ++request;
    loading = true;
    errorMessage = '';
    images = [];

    try {
      const response = await api.gallery({ id: galleryId }).get();
      if (currentRequest !== request) return;

      if (response.data) {
        images = response.data.images;
      } else {
        errorMessage = resolveError(response.error);
      }
    } catch {
      if (currentRequest === request) {
        errorMessage = 'The gallery could not be loaded.';
      }
    } finally {
      if (currentRequest === request) loading = false;
    }
  }

  $effect(() => {
    loadImages(id);
    return () => {
      request++;
    };
  });
</script>

{#if loading}
  <div class="grid animate-pulse grid-cols-2 gap-2 md:grid-cols-3" aria-label="Loading gallery">
    <div class="aspect-4/3 bg-base-200"></div>
    <div class="aspect-square bg-base-200"></div>
    <div class="hidden aspect-3/4 bg-base-200 md:block"></div>
  </div>
{:else if errorMessage}
  <div class="flex flex-col items-center border border-error/25 bg-error/5 px-6 py-12 text-center">
    <Images class="mb-4 size-8 text-error/60" />
    <p class="font-bold">Gallery unavailable</p>
    <p class="mt-2 max-w-xl text-sm text-base-content/55">{errorMessage}</p>
    <button class="btn btn-sm btn-ghost mt-5 gap-2" onclick={() => loadImages(id)}>
      <RotateCcw class="size-4" /> Try again
    </button>
  </div>
{:else if images.length > 0}
  <Gallery {images} />
{:else if empty}
  {@render empty()}
{:else}
  <div
    class="border border-dashed border-base-content/20 px-6 py-12 text-center text-sm text-base-content/50"
  >
    No photographs have been added yet.
  </div>
{/if}
