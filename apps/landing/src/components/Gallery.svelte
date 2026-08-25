<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import { slide } from 'svelte/transition';

  // @wc-ignore
  const keys = {
    Escape: 'Escape',
    ArrowRight: 'ArrowRight',
    ArrowLeft: 'ArrowLeft'
  };

  let { images }: { images: string[] } = $props();
  let splittedImages = $derived(
    (() => {
      let d: string[][] = [[], [], []];

      images.forEach((image, i) => {
        d[i % 3].push(image);
      });

      return d;
    })()
  );

  let currentImageIndex = $state<number>(0);
  let galleryOpen = $state<boolean>(false);

  let focusedDirection = $state<'l' | 'r' | null>(null);

  let eventDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  function navigatePreviousImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
  }

  function navigateNextImage() {
    currentImageIndex = (currentImageIndex + 1) % images.length;
  }

  $effect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (!galleryOpen) return;
      if (event.key === keys.Escape) {
        galleryOpen = false;
        return;
      }
      if (eventDebounceTimer !== undefined) return;

      if (event.key === keys.ArrowRight) {
        navigateNextImage();
      } else if (event.key === keys.ArrowLeft) {
        navigatePreviousImage();
      } else {
        return;
      }

      eventDebounceTimer = setTimeout(() => {
        eventDebounceTimer = undefined;
      }, 150);
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      if (eventDebounceTimer !== undefined) clearTimeout(eventDebounceTimer);
    };
  });
</script>

{#if galleryOpen}
  <div
    transition:slide={{ duration: 250 }}
    role="dialog"
    aria-modal="true"
    aria-label="Image viewer"
    class="bg-base-100/95 fixed inset-0 z-90 flex h-screen w-screen items-center justify-center p-4 backdrop-blur-md md:p-12"
  >
    <button
      type="button"
      class="btn btn-square btn-ghost absolute top-4 right-4 z-10"
      onclick={() => (galleryOpen = false)}
      aria-label="Close image viewer"
    >
      <X class="size-5" />
    </button>

    <img
      src={images[currentImageIndex]}
      class="max-h-[85vh] max-w-[90vw] object-contain transition-transform md:max-w-[75vw]"
      alt={`Gallery image ${currentImageIndex + 1} of ${images.length}`}
      style={focusedDirection === null
        ? ''
        : `${focusedDirection === 'l' ? 'transform: translateX(-10px)' : 'transform: translateX(10px)'}`}
    />

    <span
      class="text-base-content/45 absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold tracking-widest"
    >
      {String(currentImageIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
    </span>

    <button
      type="button"
      onpointerdown={() => {
        navigatePreviousImage();
        focusedDirection = 'l';
      }}
      onpointerup={() => (focusedDirection = null)}
      class="btn btn-square btn-ghost absolute bottom-4 left-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
      aria-label="Previous image"
    >
      <ChevronLeft class="size-7" />
    </button>
    <button
      type="button"
      onpointerdown={() => {
        navigateNextImage();
        focusedDirection = 'r';
      }}
      onpointerup={() => (focusedDirection = null)}
      class="btn btn-square btn-ghost absolute right-4 bottom-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
      aria-label="Next image"
    >
      <ChevronRight class="size-7" />
    </button>
  </div>
{/if}
<div class="group grid grid-cols-1 gap-2 md:grid-cols-3">
  {#each splittedImages as splitCol, splitI (splitI)}
    <div class="flex flex-col gap-2">
      {#each splitCol as image, i (i)}
        <button
          type="button"
          onclick={() => {
            currentImageIndex = i * 3 + (splitI % 3);
            galleryOpen = true;
          }}
          class={[
            'focus-visible:outline-primary w-full cursor-pointer overflow-hidden transition-all duration-200 group-hover:opacity-75 hover:z-10 hover:scale-[1.02] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2'
          ]}
        >
          <img
            src={image}
            class="w-full"
            alt={`Gallery thumbnail ${i * 3 + splitI + 1}`}
            loading="lazy"
          />
        </button>
      {/each}
    </div>
  {/each}
</div>
