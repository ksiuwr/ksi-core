<script>
  import { page } from '$app/state';
  import { editions } from '$lib/data/conferences.js';
  import { Calendar, MapPin, UsersRound } from '@lucide/svelte';
  import Gallery from '../../../components/Gallery.svelte';
  import DynamicGallery from '../../../components/DynamicGallery.svelte';
  import { api } from '$lib/backend';

  let year = $derived(page.params.year ?? '');
  let data = $derived(editions[year]);

  let bgImage = $state('');

  $effect(() => {
    api
      .gallery({ id: `zosia-${year}` })
      .bg({ name: data.bgImage })
      .get()
      .then((r) => {
        if (r.data) bgImage = r.data;
      });
  });
</script>

{#if data}
  <div class="relative w-full py-20 flex flex-col items-center justify-center overflow-hidden">
    <div
      class="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-30"
      style={`background-image: url(${bgImage})`}
    ></div>

    <span class="text-xl uppercase tracking-widest opacity-50 font-semibold"> Edition </span>
    <h1 class="lg:text-[14rem] text-[8rem] font-bold scale-y-[0.80] z-10">
      {year}
    </h1>
  </div>
  <div class="w-full py-20 mb-2 flex flex-col items-center justify-center relative overflow-hidden">
    <div class="flex md:flex-row flex-col border border-base-200">
      <div class="flex flex-col items-center text-center p-8">
        <span class="font-mono opacity-50 mb-4 uppercase flex items-center">
          <MapPin class="size-4" /> Location
        </span>
        {@html data.location.replace(',', '<br />')}
      </div>
      <div
        class="flex flex-col md:border-l border-t md:border-t-0 border-base-200 items-center text-center p-8"
      >
        <span class="font-mono opacity-50 mb-4 uppercase flex items-center"
          ><UsersRound class="size-4" /> Number of Participants</span
        >
        {data.participants}
      </div>
      <div
        class="flex flex-col md:border-l border-t md:border-t-0 border-base-200 items-center text-center p-8"
      >
        <span class=" font-mono opacity-50 mb-4 uppercase flex items-center"
          ><Calendar class="size-4" /> Camp Date</span
        >
        {data.date}
      </div>
    </div>
  </div>
  <DynamicGallery empty={emptyState} id={`zosia-${year}`} />
{:else}
  <div class="h-screen flex items-center justify-center">
    <h1 class="text-2xl opacity-50 uppercase tracking-tighter">
      Edition {year} was not found ;(
    </h1>
  </div>
{/if}

{#snippet emptyState()}
  <div class="flex flex-col gap-4 items-center w-full py-20 text-center px-6">
    <h2 class="text-2xl font-bold max-w-2xl">
      Archaeologists are wondering if ZOSIA {year} even took place. No evidence found...
    </h2>
    <p class="opacity-70">
      We don't have photos from this edition of ZOSIA. If you have any, you can send them to us so
      we can post them here.
    </p>
    <p class="font-mono font-medium text-primary transition-colors">ksi [at] cs.uni.wroc.pl</p>
    <img
      src="https://media.tenor.com/CEfTyE7rrA0AAAAi/tumbleweed-transparent.gif"
      alt="Tumbleweed rolling"
      class="w-64 opacity-80"
    />
  </div>
{/snippet}
