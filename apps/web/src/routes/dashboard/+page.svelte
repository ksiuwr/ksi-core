<script lang="ts">
  import { ArrowUpRight, Megaphone, TableProperties, Wrench } from '@lucide/svelte';
  import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet dashboardIcon()}
  <Wrench class="size-4" />
{/snippet}

<Wrapper name="dashboard" icon={dashboardIcon}>
  <header class="border-b border-base-content/15 pb-10 md:pb-14">
    <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">Admin workspace</p>
    <h1 class="mb-0! max-w-4xl text-4xl leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
      Site operations,<br />
      <span class="text-base-content/35">in one place.</span>
    </h1>
    <p class="mt-6 max-w-2xl text-lg leading-relaxed text-base-content/65">
      Manage public announcements and inspect cached object listings used across the website.
    </p>
  </header>

  <section class="py-10 md:py-14" aria-labelledby="tools-heading">
    <div class="mb-8 flex items-end justify-between gap-6">
      <div>
        <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">01 / Tools</p>
        <h2 id="tools-heading" class="mb-0! text-2xl tracking-tight sm:text-3xl">
          Choose a workspace
        </h2>
      </div>
      <span class="hidden font-mono text-xs text-base-content/40 sm:block">2 modules available</span
      >
    </div>

    <div class="grid gap-px border border-base-content/15 bg-base-content/15 md:grid-cols-2">
      <a
        href="/dashboard/alerts"
        class="group flex min-h-72 flex-col bg-base-100 p-6 hover:bg-primary/8 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="font-mono text-xs uppercase tracking-[0.16em] text-base-content/40">
            Module / 01
          </span>
          <ArrowUpRight class="size-5 group-hover:text-primary" />
        </div>
        <div class="my-auto py-10">
          <Megaphone class="mb-5 size-9 text-primary" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">Alerts</h3>
          <p class="max-w-md leading-relaxed text-base-content/60">
            Create, schedule, edit, and remove the announcements shown to visitors across the site.
          </p>
        </div>
        <span class="font-mono text-xs font-bold uppercase tracking-[0.16em]">Manage alerts →</span>
      </a>

      <a
        href="/dashboard/s3cache"
        class="group flex min-h-72 flex-col bg-base-100 p-6 hover:bg-secondary/8 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="font-mono text-xs uppercase tracking-[0.16em] text-base-content/40">
            Module / 02
          </span>
          <ArrowUpRight class="size-5 group-hover:text-secondary" />
        </div>
        <div class="my-auto py-10">
          <TableProperties class="mb-5 size-9 text-secondary" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">S3 cache</h3>
          <p class="max-w-md leading-relaxed text-base-content/60">
            Review cached Cloudflare R2 object lists and refresh individual cache keys on demand.
          </p>
        </div>
        <span class="font-mono text-xs font-bold uppercase tracking-[0.16em]">Inspect cache →</span>
      </a>
    </div>
  </section>
</Wrapper>
