<script lang="ts">
  import { ArrowUpRight, Megaphone, TableProperties, Wrench } from '@lucide/svelte';
  import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet dashboardIcon()}
  <Wrench class="size-4" />
{/snippet}

<Wrapper name="dashboard" icon={dashboardIcon}>
  <header class="border-base-content/15 border-b pb-10 md:pb-14">
    <h1 class="mb-0! max-w-4xl text-4xl leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
      Dashboard
    </h1>
    <p class="text-base-content/65 mt-6 max-w-2xl text-lg leading-relaxed">
      Manage public announcements and perform other tasks.
    </p>
  </header>

  <section class="py-10 md:py-14" aria-labelledby="tools-heading">
    <div class="mb-8 flex items-end justify-between gap-6">
      <div>
        <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">01 / Tools</p>
        <h2 id="tools-heading" class="mb-0! text-2xl tracking-tight sm:text-3xl">
          Choose a workspace
        </h2>
      </div>
      <span class="text-base-content/40 hidden font-mono text-xs sm:block">2 modules available</span
      >
    </div>

    <div class="border-base-content/15 bg-base-content/15 grid gap-px border md:grid-cols-2">
      <a
        href="/dashboard/alerts"
        class="group bg-base-100 hover:bg-primary/8 flex min-h-72 flex-col p-6 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="text-base-content/40 font-mono text-xs tracking-[0.16em] uppercase">
            Module / 01
          </span>
          <ArrowUpRight class="group-hover:text-primary size-5" />
        </div>
        <div class="my-auto py-10">
          <Megaphone class="text-primary mb-5 size-9" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">Alerts</h3>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            Create, schedule, edit, and remove the announcements shown to visitors across the site.
          </p>
        </div>
        <span class="font-mono text-xs font-bold tracking-[0.16em] uppercase">Manage alerts →</span>
      </a>

      <a
        href="/dashboard/s3cache"
        class="group bg-base-100 hover:bg-secondary/8 flex min-h-72 flex-col p-6 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="text-base-content/40 font-mono text-xs tracking-[0.16em] uppercase">
            Module / 02
          </span>
          <ArrowUpRight class="group-hover:text-secondary size-5" />
        </div>
        <div class="my-auto py-10">
          <TableProperties class="text-secondary mb-5 size-9" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">S3 cache</h3>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            Review cached Cloudflare R2 object lists and refresh individual cache keys on demand.
          </p>
        </div>
        <span class="font-mono text-xs font-bold tracking-[0.16em] uppercase">Inspect cache →</span>
      </a>
    </div>
  </section>
</Wrapper>
