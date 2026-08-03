<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { fly, slide } from 'svelte/transition';

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

  let eventDebounceTimer = $state<Timer | undefined>(undefined);

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (!galleryOpen) return;
      if (e.key === keys.Escape) {
        galleryOpen = false;
      }
      if (eventDebounceTimer != undefined) {
        return;
      }
      eventDebounceTimer = setTimeout(() => {
        eventDebounceTimer = undefined;
      }, 150);
      if (e.key === keys.ArrowRight) {
        navigateNextImage();
      } else if (e.key === keys.ArrowLeft) {
        navigatePreviousImage();
      }
    });
  }

  let navigatePreviousImage = () => {
    if (currentImageIndex > 0) currentImageIndex--;
    if (currentImageIndex === 0) currentImageIndex = images.length - 1;
  };

  let navigateNextImage = () => {
    if (currentImageIndex < images.length - 1) currentImageIndex++;
    if (currentImageIndex === images.length - 1) currentImageIndex = 0;
  };
</script>

{#if galleryOpen}
  <div
    transition:slide={{ duration: 300 }}
    role="presentation"
    onpointerdown={(e) => {
      if (e.target && 'tagName' in e.target && e.target.tagName === 'DIV') galleryOpen = false;
    }}
    class="fixed top-0 left-0 flex flex-col items-center justify-center w-screen h-screen bg-base-100 z-90"
  >
    <img
      src={images[currentImageIndex]}
      class="md:max-w-[70vw] max-h-[90vh] rounded-md transition-transform absolute"
      alt=""
      style={focusedDirection === null
        ? ''
        : `${focusedDirection === 'l' ? 'transform: translateX(-10px)' : 'transform: translateX(10px)'}`}
    />
    <button
      onpointerdown={() => {
        navigatePreviousImage();
        focusedDirection = 'l';
      }}
      onpointerup={() => (focusedDirection = null)}
      class="absolute bottom-4 md:top-1/2 md:-translate-y-1/2 left-4 p-10 md:h-screen cursor-pointer transition-all hover:text-white text-white/80 hover:-translate-x-2"
    >
      <ChevronLeft class="size-8" />
    </button>
    <button
      onpointerdown={() => {
        navigateNextImage();
        focusedDirection = 'r';
      }}
      onpointerup={() => (focusedDirection = null)}
      class="absolute bottom-4 md:top-1/2 md:-translate-y-1/2 right-4 p-10 md:h-screen cursor-pointer transition-all hover:text-white text-white/80 hover:translate-x-2"
    >
      <ChevronRight class="size-8" />
    </button>
  </div>
{/if}
<div class="grid grid-cols-1 md:grid-cols-3 group gap-2">
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
            'w-full overflow-hidden transition-all group-hover:opacity-80 hover:z-10 hover:opacity-100 duration-200 hover:scale-[1.04] hover:rounded-lg cursor-pointer'
          ]}
        >
          <img src={image} class="w-full" alt="" />
        </button>
      {/each}
    </div>
  {/each}
</div>
