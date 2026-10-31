<script lang="ts">
  import { ArrowUpRight, Megaphone, TableProperties, Wrench } from '@lucide/svelte';
  import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet dashboardIcon()}
  <Wrench class="size-4" />
{/snippet}

{#snippet hero()}
  <header class="border-base-content/15 border-b pb-10 md:pb-14">
    <h1 class="mb-0! max-w-4xl text-4xl leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
      Panel
    </h1>
    <p class="text-base-content/65 mt-6 max-w-2xl text-lg leading-relaxed">
      Zarządzaj ogłoszeniami publicznymi i wykonuj inne zadania.
    </p>
  </header>
{/snippet}

<Wrapper name="dashboard" icon={dashboardIcon} {hero}>
  <section class="py-10 md:py-14" aria-labelledby="tools-heading">
    <div class="mb-8 flex items-end justify-between gap-6">
      <div>
        <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">01 / Narzędzia</p>
        <h2 id="tools-heading" class="mb-0! text-2xl tracking-tight sm:text-3xl">
          Wybierz obszar roboczy
        </h2>
      </div>
      <span class="text-base-content/40 hidden font-mono text-xs sm:block">Dostępne moduły: 2</span>
    </div>

    <div class="border-base-content/15 bg-base-content/15 grid gap-px border md:grid-cols-2">
      <a
        href="/dashboard/alerts"
        class="group bg-base-100 hover:bg-primary/8 flex min-h-72 flex-col p-6 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="text-base-content/40 font-mono text-xs tracking-[0.16em] uppercase">
            Moduł / 01
          </span>
          <ArrowUpRight class="group-hover:text-primary size-5" />
        </div>
        <div class="my-auto py-10">
          <Megaphone class="text-primary mb-5 size-9" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">Alerty</h3>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            Twórz, planuj, edytuj i usuwaj komunikaty wyświetlane odwiedzającym w całej witrynie.
          </p>
        </div>
        <span class="font-mono text-xs font-bold tracking-[0.16em] uppercase"
          >Zarządzaj alertami →</span
        >
      </a>

      <a
        href="/dashboard/s3cache"
        class="group bg-base-100 hover:bg-secondary/8 flex min-h-72 flex-col p-6 md:p-8"
      >
        <div class="flex items-start justify-between">
          <span class="text-base-content/40 font-mono text-xs tracking-[0.16em] uppercase">
            Moduł / 02
          </span>
          <ArrowUpRight class="group-hover:text-secondary size-5" />
        </div>
        <div class="my-auto py-10">
          <TableProperties class="text-secondary mb-5 size-9" strokeWidth={1.5} />
          <h3 class="mb-2! text-3xl tracking-tight">Pamięć podręczna S3</h3>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            Przeglądaj listy obiektów Cloudflare R2 zapisane w pamięci podręcznej i w razie potrzeby
            odświeżaj poszczególne klucze.
          </p>
        </div>
        <span class="font-mono text-xs font-bold tracking-[0.16em] uppercase"
          >Przejrzyj pamięć podręczną →</span
        >
      </a>
    </div>
  </section>
</Wrapper>
