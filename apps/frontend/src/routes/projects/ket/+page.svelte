<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import { SquareArrowOutUpRight } from '@lucide/svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<Wrapper name="projects/ket.md">
  <div
    class="markdown-file flex flex-col gap-8 py-8 pl-px md:pl-16 max-w-4xl mx-auto text-base-content"
  >
    <header class="flex flex-col gap-4 pb-8">
      <h1>KET</h1>
      <a
        class="btn btn-outline w-min whitespace-nowrap"
        href="https://forms.gle/do7yFM1py8SsKeXd9"
        target="_blank"
      >
        <SquareArrowOutUpRight class="size-4" />
        {m.eager_clever_iguana_run()}
      </a>
    </header>

    <div class="space-y-12">
      <section class="space-y-6">
        <p class="text-balance">
          {m.glad_loud_dog_walk()}
        </p>
      </section>

      <img src="/projects/ket/plakat.webp" alt="" />

      <section class="space-y-6 w-full">
        <h2>{m.clean_plane_finch_spin()}</h2>

        <div class="flex flex-col gap-4 w-full">
          <Goal type="scientific">
            {m.shy_brave_bear_walk()}
          </Goal>

          <Goal type="technical">
            {m.wild_calm_owl_walk()}
          </Goal>
        </div>
      </section>

      <section class="space-y-4">
        <h2>{m.last_lucky_reindeer_belong()}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
          {#each ['Dawid Stadnik', 'Igor Nowicki', 'Jakub Horn', 'Julia Zbińska', 'Magdalena Majda', 'Maja Skóra', 'Piotr Wdowiak'] as member, i (i)}
            <div
              class="flex items-center gap-3 px-4 py-3 rounded bg-base-200/30 border border-base-content/5 hover:border-base-content/20 transition-colors cursor-default"
            >
              <span class="text-base-content/30 font-bold select-none">{i + 1}.</span>
              <span class="text-base-content/90 tracking-wide font-medium">{member}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
</Wrapper>
