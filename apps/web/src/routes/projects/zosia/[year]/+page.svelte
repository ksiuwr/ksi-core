<script lang="ts">
  import { ArrowLeft, Calendar, Images, MapPin, UsersRound } from '@lucide/svelte';
  import DynamicGallery from '../../../../components/DynamicGallery.svelte';
  import Wrapper from '../../../../components/Wrapper.svelte';
  import { api } from '$lib/backend';

  let {
    data
  }: {
    data: {
      year: string;
      edition: {
        location: string;
        participants: number;
        date: string;
        bgImage?: string;
      };
    };
  } = $props();
  let bgImage = $state('');

  $effect(() => {
    bgImage = '';
    if (!data.edition.bgImage) return;

    api
      .gallery({ id: `zosia-${data.year}` })
      .bg({ name: data.edition.bgImage })
      .get()
      .then((response) => {
        if (response.data) bgImage = response.data;
      })
      .catch(() => {
        bgImage = '';
      });
  });
</script>

{#snippet emptyState()}
  <div class="border border-dashed border-base-content/20 px-6 py-16 text-center">
    <Images class="mx-auto mb-5 size-8 text-base-content/25" />
    <h3 class="mb-3! text-xl">No photographs in the archive yet.</h3>
    <p class="mx-auto max-w-2xl text-sm leading-relaxed text-base-content/55">
      If you have photos from ZOSIA {data.year}, send them to
      <span class="font-medium text-primary">ksi [at] cs.uni.wroc.pl</span> so we can preserve them here.
    </p>
  </div>
{/snippet}

<Wrapper name={`projects / zosia / ${data.year}`}>
  <a
    href="/projects/zosia"
    class="mb-8 flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/45 hover:text-primary"
  >
    <ArrowLeft class="size-4" /> Back to all editions
  </a>

  <header class="relative min-h-112 overflow-hidden border border-base-content/15 bg-base-200">
    {#if bgImage}
      <div
        class="absolute inset-0 bg-cover bg-center opacity-35"
        style={`background-image: url(${bgImage})`}
      ></div>
      <div
        class="absolute inset-0 bg-linear-to-t from-base-100 via-base-100/30 to-transparent"
      ></div>
    {/if}

    <div class="relative flex min-h-112 flex-col justify-between p-6 md:p-10">
      <span
        class="w-fit border border-base-content/20 bg-base-100/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur"
        >ZOSIA edition</span
      >
      <h1 class="mb-0! text-7xl leading-[0.75]! tracking-[-0.08em] sm:text-8xl lg:text-[10rem]">
        {data.year}
      </h1>
    </div>
  </header>

  <section
    class="grid gap-px bg-base-content/15 border-x border-b border-base-content/15 md:grid-cols-3"
  >
    <div class="bg-base-100 p-6 md:p-8">
      <span
        class="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/40"
        ><MapPin class="size-4 text-primary" /> Location</span
      >
      <p class="leading-relaxed">{data.edition.location}</p>
    </div>
    <div class="bg-base-100 p-6 md:p-8">
      <span
        class="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/40"
        ><UsersRound class="size-4 text-primary" /> Participants</span
      >
      <p class="text-3xl font-bold">{data.edition.participants}</p>
    </div>
    <div class="bg-base-100 p-6 md:p-8">
      <span
        class="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/40"
        ><Calendar class="size-4 text-primary" /> Camp date</span
      >
      <p class="leading-relaxed">{data.edition.date}</p>
    </div>
  </section>

  <section class="py-16 lg:py-24">
    <div class="mb-10">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Photo archive</p>
      <h2 class="mb-0! text-3xl tracking-tight md:text-5xl">Moments from {data.year}</h2>
    </div>
    <DynamicGallery empty={emptyState} id={`zosia-${data.year}`} />
  </section>
</Wrapper>
