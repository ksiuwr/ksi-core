<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
</script>

<svelte:head><title>Artykuły · KSI UWr</title></svelte:head>

<main class="flex-1">
  <header class="border-line border-b">
    <div class="page-container py-14 md:py-20">
      <p class="eyebrow"><span class="dot"></span>Blog</p>
      <h1 class="mt-4 text-[clamp(40px,6vw,64px)] font-bold tracking-[-0.045em]">Artykuły</h1>
      <p class="text-muted mt-4 max-w-xl text-lg leading-relaxed">
        Aktualności, artykuły i relacje członków KSI.
      </p>
    </div>
  </header>
  <div class="page-container py-10 pb-20">
    <div class="max-w-4xl">
      <ArticleList articles={data.articles} />
    </div>
  </div>
</main>
