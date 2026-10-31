<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte';
  import ProjectCover from './ProjectCover.svelte';
</script>

<section
  class="surface-card relative isolate overflow-hidden"
  aria-labelledby="contact-banner-heading"
>
  <div class="absolute inset-0 -z-10 opacity-60">
    <ProjectCover slug="ksi" fields={['community']} width={1200} height={260} class="size-full" />
  </div>
  <div
    class="from-surface via-surface/90 absolute inset-0 -z-10 bg-gradient-to-r to-transparent"
  ></div>
  <div
    class="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12"
  >
    <h2 id="contact-banner-heading" class="text-[clamp(26px,3.5vw,36px)] tracking-tight">
      Masz pomysł na projekt?
    </h2>
    <a href="mailto:ksi@cs.uni.wroc.pl" class="btn btn-lg group">
      Napisz do nas
      <ArrowUpRight
        class="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </a>
  </div>
</section>
