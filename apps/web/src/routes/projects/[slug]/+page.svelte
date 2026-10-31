<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import { locale } from '$lib/locale.svelte';
  import {
    ArrowLeft,
    ArrowUpRight,
    CircleCheck,
    LayoutDashboard,
    Plus,
    Shield
  } from '@lucide/svelte';
  import FieldTag from '../../../components/ui/FieldTag.svelte';
  import ProjectCover from '../../../components/ui/ProjectCover.svelte';

  let { data, form } = $props<{
    data: import('./$types').PageData;
    form: import('./$types').ActionData;
  }>();
  let project = $derived(data.project);
  let user = $derived(data.user);
  const language = $derived(locale.current);
</script>

<svelte:head><title>{project.name} · KSI UWr</title></svelte:head>

<main class="page-container flex-1 pt-6 pb-20">
  <a
    href="/projects"
    class="text-muted hover:text-ink inline-flex items-center gap-2 py-1.5 text-[13px]"
    ><ArrowLeft class="size-4" aria-hidden="true" />Wszystkie projekty</a
  >

  <header class="surface-card mt-4 overflow-hidden">
    <ProjectCover
      slug={project.slug}
      fields={project.fields}
      width={1200}
      height={280}
      class="border-line h-40 border-b sm:h-52 md:h-60"
    />
    <div class="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
      <div class="min-w-0">
        {#if project.fields?.length}
          <div class="mb-3 flex flex-wrap gap-1.5">
            {#each project.fields as field (field)}<FieldTag {field} />{/each}
          </div>
        {/if}
        <h1 class="text-[clamp(32px,5vw,52px)] font-bold tracking-[-0.045em] wrap-anywhere">
          {project.name}
        </h1>
        {#if project.tags?.length > 0}
          <div class="mt-4 flex flex-wrap gap-1.5">
            {#each project.tags as tag (tag)}
              <span class="tag">#{tag}</span>
            {/each}
          </div>
        {/if}
      </div>

      {#if user?.membershipStatus === 'active'}
        <div class="flex shrink-0 flex-wrap gap-2">
          {#if data.access.canEdit || data.access.canManageMembers}
            <a
              href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}/settings`}
              class="btn btn-outline"><Shield /> Ustawienia projektu</a
            >
          {/if}
          {#if !data.access.isMember && !form?.joined}
            <form method="POST" action="?/join">
              <button class="btn"><Plus /> Dołącz do projektu</button>
            </form>
          {:else if data.access.isMember}
            <a
              href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}`}
              class="btn"><LayoutDashboard /> Otwórz przestrzeń projektu</a
            >
          {/if}
        </div>
      {/if}
    </div>
  </header>

  {#if form?.joined}
    <p
      role="status"
      class="border-line bg-surface-muted mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
    >
      <CircleCheck class="text-muted size-4 shrink-0" aria-hidden="true" />
      {#if form.requested}
        Prośba o dołączenie została wysłana.
      {:else}
        Dołączono do projektu.
      {/if}
    </p>
  {/if}
  {#if form && 'message' in form}<p role="alert" class="error mt-4">{form.message}</p>{/if}

  <div class="mx-auto max-w-4xl">
    {#if project.description}
      <div class="project-description mt-10">
        <Markdown blocks={data.descriptionBlocks} {language} />
      </div>
    {/if}

    {#each project.sections as section (section)}
      <section class="border-line mt-12 border-t pt-10">
        {#if section === 'main-article' && project.mainArticle}
          <h2 class="mb-6 text-2xl tracking-tight">{project.mainArticle.title}</h2>
          <div class="project-description">
            <Markdown blocks={data.mainArticleBlocks} {language} />
          </div>
        {:else if section === 'articles'}
          <h2 class="mb-6 text-2xl tracking-tight">Artykuły</h2>
          <ArticleList articles={project.articles} />
        {:else if section === 'leaders' || section === 'members'}
          <h2 class="mb-6 text-2xl tracking-tight">
            {#if section === 'leaders'}Liderzy projektu{:else}Członkowie{/if}
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each section === 'leaders' ? project.leaders : project.members as member (member.id)}
              <div class="surface-card px-4 py-3">
                <MemberPreview {member} href={`/members/${encodeURIComponent(member.id)}`} />
              </div>
            {/each}
          </div>
        {:else if section === 'links'}
          <h2 class="mb-6 text-2xl tracking-tight">Linki</h2>
          <div class="flex flex-wrap gap-2">
            {#each project.links as link (link.id)}<a
                class="btn btn-outline group"
                href={link.url}
                rel="noopener noreferrer"
                >{link.label}<ArrowUpRight
                  class="text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                /></a
              >{/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</main>

<style>
  .project-description {
    font-size: 17px;
    line-height: 1.75;
    color: color-mix(in oklch, var(--ink) 85%, var(--muted));
  }
</style>
