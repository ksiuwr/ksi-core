<script lang="ts">
  import { ArrowUpRight, Calendar, MapPin, Star, UsersRound } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { editions } from '$lib/data/conferences.js';

  const years = Object.keys(editions).sort((a, b) => Number(b) - Number(a));
</script>

{#snippet starIcon()}
  <Star class="size-4 text-primary" />
{/snippet}

<Wrapper name="projects / zosia" icon={starIcon}>
  <header
    class="grid gap-10 border-b border-base-content/15 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
  >
    <div>
      <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
        Since the early 2000s
      </p>
      <h1 class="mb-0! text-6xl leading-[0.85]! tracking-[-0.07em] sm:text-7xl lg:text-9xl">
        ZOSIA
      </h1>
      <p class="mt-6 text-lg text-base-content/50">Winter Camp of Computer Science Students</p>
    </div>
    <p class="max-w-2xl text-lg leading-relaxed text-base-content/70">
      What began as an informal trip among friends now brings together nearly 300 students,
      researchers, and technology professionals for three days of ideas and community.
    </p>
  </header>

  <section class="grid gap-px border-b border-base-content/15 bg-base-content/15 lg:grid-cols-3">
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-xs font-bold uppercase tracking-widest text-base-content/35">Talks</span>
      <p class="mt-8 leading-relaxed text-base-content/65">
        Lectures and presentations from academia and the technology industry.
      </p>
    </div>
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-xs font-bold uppercase tracking-widest text-base-content/35">People</span>
      <p class="mt-8 leading-relaxed text-base-content/65">
        Students from different universities sharing knowledge and experience.
      </p>
    </div>
    <div class="bg-base-100 p-6 lg:p-8">
      <span class="text-xs font-bold uppercase tracking-widest text-base-content/35"
        >Atmosphere</span
      >
      <p class="mt-8 leading-relaxed text-base-content/65">
        Excursions and social events in a unique winter setting.
      </p>
    </div>
  </section>

  <section class="py-16 lg:py-24">
    <div class="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Edition archive
        </p>
        <h2 class="mb-0! text-3xl tracking-tight md:text-5xl">Every year tells a story.</h2>
      </div>
      <p class="max-w-md text-sm leading-relaxed text-base-content/50">
        Browse dates, attendance, locations, and photographs from previous camps.
      </p>
    </div>

    <div class="grid gap-px border border-base-content/15 bg-base-content/15 lg:grid-cols-3">
      {#each years as year (year)}
        {@const edition = editions[year]}
        <a
          href={`/projects/zosia/${year}`}
          class="group flex min-h-80 flex-col bg-base-100 p-6 transition-colors hover:bg-primary/8 md:p-8"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-widest text-base-content/40">Edition</span>
            <ArrowUpRight
              class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
            />
          </div>
          <strong class="my-auto text-6xl tracking-[-0.08em] md:text-7xl">{year}</strong>
          <div class="space-y-2 border-t border-base-content/10 pt-5 text-xs text-base-content/55">
            <p class="flex items-center gap-2">
              <Calendar class="size-3.5 text-primary" />
              {edition.date}
            </p>
            <p class="flex items-center gap-2">
              <UsersRound class="size-3.5 text-primary" />
              {edition.participants} participants
            </p>
            <p class="flex items-start gap-2">
              <MapPin class="mt-0.5 size-3.5 shrink-0 text-primary" />
              {edition.location}
            </p>
          </div>
        </a>
      {/each}
    </div>
  </section>
</Wrapper>
