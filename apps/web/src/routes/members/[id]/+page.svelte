<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import { Github, Linkedin } from '@lucide/svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const initials = $derived(
    data.member.name
      .split(/\s+/)
      .filter(Boolean)
      .filter(
        (_: string, index: number, words: string[]) => index === 0 || index === words.length - 1
      )
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
  );
</script>

<svelte:head><title>{data.member.name} · KSI UWr</title></svelte:head>
<main class="page-container flex-1 pt-10 pb-20">
  <div class="mx-auto max-w-4xl">
    <header class="surface-card relative overflow-hidden p-6 sm:p-8">
      <div class="profile-backdrop" aria-hidden="true"></div>
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        {#if data.member.image}<img
            class="ring-surface size-24 shrink-0 rounded-full object-cover shadow-[var(--shadow-sm)] ring-4"
            src={data.member.image}
            alt=""
          />{:else}<span class="profile-initials" aria-hidden="true">{initials}</span>{/if}
        <div class="min-w-0">
          <h1 class="text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.045em] wrap-anywhere">
            {data.member.name}
          </h1>
          {#if data.member.nickname}<p class="text-muted mt-1 font-mono text-sm">
              aka. {data.member.nickname}
            </p>{/if}
        </div>
      </div>
      {#if data.member.bio}<p
          class="relative mt-6 max-w-2xl leading-relaxed wrap-anywhere whitespace-pre-wrap"
        >
          {data.member.bio}
        </p>{/if}
      {#if data.member.github || data.member.linkedin}
        <div class="relative mt-6 flex flex-wrap gap-2">
          {#if data.member.github}<a
              class="btn btn-outline"
              href={data.member.github}
              target="_blank"
              rel="noopener noreferrer"><Github />GitHub</a
            >{/if}{#if data.member.linkedin}<a
              class="btn btn-outline"
              href={data.member.linkedin}
              target="_blank"
              rel="noopener noreferrer"><Linkedin />LinkedIn</a
            >{/if}
        </div>
      {/if}
    </header>
    <section class="mt-12" aria-labelledby="member-articles-heading">
      <h2 id="member-articles-heading" class="mb-6 text-2xl tracking-tight">Artykuły</h2>
      <ArticleList articles={data.member.articles} />
    </section>
  </div>
</main>

<style>
  .profile-backdrop {
    position: absolute;
    inset: 0 0 auto;
    height: 96px;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 14%, transparent) 1px,
      transparent 1px
    );
    background-size: 18px 18px;
    mask-image: linear-gradient(to bottom, #000, transparent);
  }
  .profile-initials {
    display: grid;
    place-items: center;
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    border: 4px solid var(--surface);
    border-radius: 50%;
    background: var(--lavender);
    box-shadow: var(--shadow-sm);
    font-family: var(--display);
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
</style>
