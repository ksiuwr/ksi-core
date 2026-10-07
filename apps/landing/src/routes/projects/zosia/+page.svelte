<script lang="ts">
  import { ArrowUpRight, Calendar, MapPin, Star, UsersRound } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { editions } from '$lib/data/conferences.js';

  const years = Object.keys(editions).sort((a, b) => Number(b) - Number(a));
</script>

{#snippet starIcon()}
  <Star class="text-primary size-4" />
{/snippet}

<Wrapper name="projects / zosia" icon={starIcon}>
  <header
    class="border-base-content/15 grid gap-10 border-b pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
  >
    <div>
      <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">
        Since the early 2000s
      </p>
      <h1 class="mb-0! text-6xl leading-[0.85]! tracking-[-0.07em] sm:text-7xl lg:text-9xl">
        ZOSIA
      </h1>
      <p class="text-base-content/50 mt-6 text-lg">Winter Camp of Computer Science Students</p>
    </div>
    <p class="text-base-content/70 max-w-2xl text-lg leading-relaxed">
      What began as an informal trip among friends now brings together nearly 300 students,
      researchers, and technology professionals for three days of ideas and community.
    </p>
  </header>

  <section class="border-base-content/15 bg-base-content/15 grid gap-px border-b lg:grid-cols-3">
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-base-content/35 text-xs font-bold tracking-widest uppercase">Talks</span>
      <p class="text-base-content/65 mt-8 leading-relaxed">
        Lectures and presentations from academia and the technology industry.
      </p>
    </div>
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-base-content/35 text-xs font-bold tracking-widest uppercase">People</span>
      <p class="text-base-content/65 mt-8 leading-relaxed">
        Students from different universities sharing knowledge and experience.
      </p>
    </div>
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-base-content/35 text-xs font-bold tracking-widest uppercase"
        >Atmosphere</span
      >
      <p class="text-base-content/65 mt-8 leading-relaxed">
        Excursions and social events in a unique winter setting.
      </p>
    </div>
  </section>

  <section class="py-16 lg:py-24">
    <div class="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
          Edition archive
        </p>
        <h2 class="mb-0! text-3xl tracking-tight md:text-5xl">Every year tells a story.</h2>
      </div>
      <p class="text-base-content/50 max-w-md text-sm leading-relaxed">
        Browse dates, attendance, locations, and photographs from previous camps.
      </p>
    </div>

    <div class="border-base-content/15 bg-base-content/15 grid gap-px border lg:grid-cols-3">
      {#each years as year (year)}
        {@const edition = editions[year]}
        <a
          href={`/projects/zosia/${year}`}
          class="group bg-base-100 hover:bg-primary/8 flex min-h-80 flex-col p-6 transition-colors md:p-8"
        >
          <div class="flex items-center justify-between">
            <span class="text-base-content/40 text-xs tracking-widest uppercase">Edition</span>
            <ArrowUpRight
              class="group-hover:text-primary size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
          <strong class="my-auto text-6xl tracking-[-0.08em] md:text-7xl">{year}</strong>
          <div class="border-base-content/10 text-base-content/55 space-y-2 border-t pt-5 text-xs">
            <p class="flex items-center gap-2">
              <Calendar class="text-primary size-3.5" />
              {edition.date}
            </p>
            <p class="flex items-center gap-2">
              <UsersRound class="text-primary size-3.5" />
              {edition.participants} participants
            </p>
            <p class="flex items-start gap-2">
              <MapPin class="text-primary mt-0.5 size-3.5 shrink-0" />
              {edition.location}
            </p>
          </div>
        </a>
      {/each}
    </div>
  </section>
</Wrapper>
