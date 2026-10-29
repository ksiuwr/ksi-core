<script lang="ts">
  import { ArrowRight, Microscope, Presentation, Lightbulb } from '@lucide/svelte';
  import ProjectCard from '../components/ui/ProjectCard.svelte';
  import ContactBanner from '../components/ui/ContactBanner.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
</script>

<main class="flex-1">
  <section class="hero border-line relative isolate overflow-hidden border-b">
    <div
      class="page-container grid items-center gap-12 pt-14 pb-24 md:pt-20 md:pb-32 lg:grid-cols-[1.05fr_1fr]"
    >
      <div>
        <p
          class="border-line bg-surface text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-xs"
        >
          <span class="dot"></span>
          Student association at the University of Wrocław
        </p>
        <h1 class="mt-6 text-[clamp(48px,8vw,84px)] leading-[0.98] font-bold tracking-[-0.05em]">
          We're KSI.
        </h1>
        <p class="text-muted mt-6 max-w-xl text-lg leading-relaxed">
          We're computer science students at the University of Wrocław. We build software and
          organize workshops and events.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#projects" class="btn btn-lg btn-accent group"
            >See what we do <ArrowRight
              class="transition-transform group-hover:translate-x-0.5"
            /></a
          >
          <a href="#about" class="btn btn-lg btn-outline">About KSI</a>
        </div>
      </div>
      <div class="hero-photo relative mx-auto w-full max-w-xl lg:mr-0">
        <img
          src="/members/0.webp"
          class="border-line relative aspect-[4/3] w-full rounded-2xl border object-cover"
          alt="KSI Members"
        />
      </div>
    </div>
  </section>

  <div class="page-container">
    <dl
      class="surface-card divide-line relative -mt-12 grid divide-y shadow-[var(--shadow-md)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      <div class="flex flex-col-reverse gap-1 p-6">
        <dt class="text-muted text-sm">Children taught programming</dt>
        <dd class="font-display text-4xl font-semibold tracking-tight">500+</dd>
      </div>
      <div class="flex flex-col-reverse gap-1 p-6">
        <dt class="text-muted text-sm">Conferences organized</dt>
        <dd class="font-display text-4xl font-semibold tracking-tight">25+</dd>
      </div>
      <div class="flex flex-col-reverse gap-1 p-6">
        <dt class="text-muted text-sm">On-site lectures hosted</dt>
        <dd class="font-display text-4xl font-semibold tracking-tight">20+</dd>
      </div>
    </dl>

    <section id="about" class="scroll-mt-20 py-20" aria-labelledby="about-heading">
      <h2 id="about-heading" class="mb-8 text-3xl tracking-tight">Events and workshops</h2>
      <div class="grid gap-5 md:grid-cols-2">
        <a
          href="/projects/zosia"
          class="group surface-card surface-card-link text-ink flex flex-col overflow-hidden"
        >
          <div class="border-line aspect-[16/9] overflow-hidden border-b">
            <img
              src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/zosia-2026/01.webp"
              alt="ZOSIA"
              class="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
          <div class="flex flex-1 flex-col p-6">
            <h3 class="text-xl">ZOSIA</h3>
            <p class="text-muted mt-2 flex-1 text-sm leading-relaxed">
              Our winter camp in the mountains of Lower Silesia, with talks on research and hobbies,
              and time to hang out.
            </p>
            <span class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
              Read more
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>

        <a
          href="/projects/hoc"
          class="group surface-card surface-card-link text-ink flex flex-col overflow-hidden"
        >
          <div class="border-line aspect-[16/9] overflow-hidden border-b">
            <img
              src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/project-hoc-past/8.webp"
              alt="Hour of Code"
              class="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
          <div class="flex flex-1 flex-col p-6">
            <h3 class="text-xl">Hour of Code</h3>
            <p class="text-muted mt-2 flex-1 text-sm leading-relaxed">
              We teach children programming in one-hour workshops.
            </p>
            <span class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
              Read more
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>
      </div>
    </section>

    <section id="projects" class="scroll-mt-20 pb-20" aria-labelledby="projects-heading">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="projects-heading" class="text-3xl tracking-tight">Our projects</h2>
        <a href="/projects" class="btn btn-outline btn-sm group">
          See more projects
          <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      {#if data.projects.length}
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {#each data.projects as project (project.slug)}
            <ProjectCard {project} />
          {/each}
        </div>
      {:else}
        <p class="border-input text-muted rounded-xl border border-dashed p-10 text-center text-sm">
          More projects coming soon.
        </p>
      {/if}
    </section>

    <section id="scientific" class="scroll-mt-20 pb-20" aria-labelledby="research-heading">
      <h2 id="research-heading" class="mb-8 text-3xl tracking-tight">Research at KSI</h2>
      <div class="grid gap-5 md:grid-cols-3" data-field="research">
        <div class="surface-card flex flex-col gap-5 p-6">
          <span class="icon-tile"><Microscope /></span>
          <div>
            <h3 class="text-base">Reading groups</h3>
            <p class="text-muted mt-1.5 text-sm leading-relaxed">
              We meet to read and discuss research papers.
            </p>
          </div>
        </div>
        <div class="surface-card flex flex-col gap-5 p-6">
          <span class="icon-tile"><Presentation /></span>
          <div>
            <h3 class="text-base">Guest seminars</h3>
            <p class="text-muted mt-1.5 text-sm leading-relaxed">
              Researchers and alumni talk about their work.
            </p>
          </div>
        </div>
        <div class="surface-card flex flex-col gap-5 p-6">
          <span class="icon-tile"><Lightbulb /></span>
          <div>
            <h3 class="text-base">Research projects</h3>
            <p class="text-muted mt-1.5 text-sm leading-relaxed">
              We work on research problems with faculty.
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="pb-20">
      <ContactBanner />
    </div>
  </div>
</main>

<style>
  /* A dotted canvas that fades out towards the edges. */
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 16%, transparent) 1px,
      transparent 1px
    );
    background-size: 22px 22px;
    mask-image: radial-gradient(ellipse 70% 80% at 70% 40%, #000 30%, transparent 75%);
  }
  .hero-photo::before {
    content: '';
    position: absolute;
    inset: 0;
    translate: 12px 12px;
    border-radius: 1rem;
    background: var(--lavender);
    border: 1px solid var(--line);
  }
</style>
