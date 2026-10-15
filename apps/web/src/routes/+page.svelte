<script lang="ts">
  import { ArrowRight, Microscope, Presentation, Lightbulb, ArrowUpRight } from '@lucide/svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
</script>

<main class="bg-base-100 min-h-[calc(100vh-56px)] w-full">
  <div class="mx-auto max-w-[900px] px-5 py-[60px]">
    <!-- Hero -->
    <div class="mb-20 flex flex-wrap items-center gap-10">
      <div class="min-w-[300px] flex-1">
        <h1
          class="font-anybody text-base-content mb-5 text-[clamp(40px,8vw,64px)] leading-[1.1] font-bold tracking-tight"
        >
          We're KSI.
        </h1>
        <p class="text-base-content/70 mb-8 max-w-[600px] text-[18px] leading-relaxed">
          We're computer science students at the University of Wrocław. We build software and
          organize workshops and events.
        </p>
        <div class="flex flex-wrap gap-3">
          <a href="#projects" class="btn">See what we do <ArrowRight size={16} /></a>
          <a href="#about" class="btn btn-outline">About KSI</a>
        </div>
      </div>
      <div class="flex min-w-[300px] flex-1 justify-end">
        <img
          src="/members/0.webp"
          class="border-base-content/20 max-w-full rounded border object-cover opacity-90"
          alt="KSI Members"
        />
      </div>
    </div>

    <!-- Socially -->
    <section id="about" class="mb-20">
      <div class="text-base-content/70 mb-5 font-mono text-[11px] tracking-wider uppercase">
        Events and workshops
      </div>
      <div class="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div class="card border-base-content/20 bg-base-100 rounded border p-6">
          <h3 class="font-anybody text-primary m-0 mb-2 text-[32px]">500+</h3>
          <p class="text-base-content/70 m-0 text-[12px]">Children taught programming</p>
        </div>
        <div class="card border-base-content/20 bg-base-100 rounded border p-6">
          <h3 class="font-anybody text-primary m-0 mb-2 text-[32px]">25+</h3>
          <p class="text-base-content/70 m-0 text-[12px]">Conferences organized</p>
        </div>
        <div class="card border-base-content/20 bg-base-100 rounded border p-6">
          <h3 class="font-anybody text-primary m-0 mb-2 text-[32px]">20+</h3>
          <p class="text-base-content/70 m-0 text-[12px]">On-site lectures hosted</p>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        <div
          class="card border-base-content/20 bg-base-100 flex flex-col items-stretch overflow-hidden rounded border p-0"
        >
          <img
            src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/zosia-2026/01.webp"
            alt="ZOSIA"
            class="border-base-content/20 h-[200px] w-full border-b object-cover"
          />
          <div class="flex flex-1 flex-col items-start p-6">
            <h3 class="font-anybody text-base-content m-0 mb-3 text-[18px]">ZOSIA</h3>
            <p class="text-base-content/70 mb-5 flex-1 text-[13px] leading-relaxed">
              Our winter camp in the mountains of Lower Silesia, with talks on research and hobbies,
              and time to hang out.
            </p>
            <a href="/projects/zosia" class="btn btn-outline">Read more</a>
          </div>
        </div>

        <div
          class="card border-base-content/20 bg-base-100 flex flex-col items-stretch overflow-hidden rounded border p-0"
        >
          <img
            src="https://pub-4e8af66414434008bafa6614f6af4b22.r2.dev/project-hoc-past/8.webp"
            alt="Hour of Code"
            class="border-base-content/20 h-[200px] w-full border-b object-cover"
          />
          <div class="flex flex-1 flex-col items-start p-6">
            <h3 class="font-anybody text-base-content m-0 mb-3 text-[18px]">Hour of Code</h3>
            <p class="text-base-content/70 mb-5 flex-1 text-[13px] leading-relaxed">
              We teach children programming in one-hour workshops.
            </p>
            <a href="/projects/hoc" class="btn btn-outline">Read more</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Technically -->
    <section id="projects" class="mb-20">
      <div class="text-base-content/70 mb-5 font-mono text-[11px] tracking-wider uppercase">
        Our projects
      </div>
      <div class="flex flex-col gap-8">
        {#each data.projects as project (project.slug)}
          <a
            href={`/projects/${encodeURIComponent(project.slug)}`}
            class="card group border-base-content/20 bg-base-100 hover:bg-base-200 grid grid-cols-1 overflow-hidden rounded border p-0 no-underline transition-colors md:grid-cols-2"
          >
            <div
              class="border-base-content/20 bg-primary/10 flex min-h-50 items-center justify-center border-b p-8 md:border-r md:border-b-0"
            >
              <Lightbulb size={64} aria-hidden="true" />
            </div>
            <div class="bg-neutral flex flex-col justify-center gap-4 p-8 px-6">
              <div class="flex items-center justify-between">
                <span class="text-base-content/70 font-mono text-[11px] tracking-wider uppercase">
                  {project.slug}
                </span>
                <span class="text-primary flex items-center gap-1 text-[11px]">
                  Open project <ArrowUpRight size={14} />
                </span>
              </div>
              <div>
                <h2 class="font-anybody text-base-content m-0 mb-3 text-[24px]">
                  {project.name}
                </h2>
                <p class="text-base-content/70 m-0 text-[14px] leading-relaxed">
                  {project.description}
                </p>
              </div>
            </div>
          </a>
        {/each}
        {#if data.projects.length === 0}
          <p class="text-base-content/70 text-[13px]">More projects coming soon.</p>
        {/if}
      </div>
    </section>

    <section id="scientific" class="mb-15">
      <div class="text-base-content/70 mb-5 font-mono text-[11px] tracking-wider uppercase">
        Research at KSI
      </div>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <div class="card border-base-content/20 bg-base-100 flex flex-col gap-4 rounded border p-6">
          <Microscope size={28} class="text-primary" />
          <div>
            <h3 class="font-anybody text-base-content m-0 mb-2 text-[16px]">Reading groups</h3>
            <p class="text-base-content/70 m-0 text-[13px] leading-normal">
              We meet to read and discuss research papers.
            </p>
          </div>
        </div>
        <div class="card border-base-content/20 bg-base-100 flex flex-col gap-4 rounded border p-6">
          <Presentation size={28} class="text-primary" />
          <div>
            <h3 class="font-anybody text-base-content m-0 mb-2 text-[16px]">Guest seminars</h3>
            <p class="text-base-content/70 m-0 text-[13px] leading-normal">
              Researchers and alumni talk about their work.
            </p>
          </div>
        </div>
        <div class="card border-base-content/20 bg-base-100 flex flex-col gap-4 rounded border p-6">
          <Lightbulb size={28} class="text-primary" />
          <div>
            <h3 class="font-anybody text-base-content m-0 mb-2 text-[16px]">Research projects</h3>
            <p class="text-base-content/70 m-0 text-[13px] leading-normal">
              We work on research problems with faculty.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</main>
