<script lang="ts">
  import ArticleList from '$lib/components/ArticleList.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import { locale } from '$lib/locale.svelte';
  import { Shield, Plus } from '@lucide/svelte';

  let { data, form } = $props<{
    data: import('./$types').PageData;
    form: import('./$types').ActionData;
  }>();
  let project = $derived(data.project);
  let user = $derived(data.user);
  const language = $derived(locale.current === 'pl' ? 'pl' : 'en');
</script>

<div class="page-gutter py-12">
  <div class="mb-8 flex flex-wrap items-center justify-between gap-6">
    <h1 class="text-4xl font-bold">{project.name}</h1>

    <div class="flex flex-wrap gap-4">
      {#if user?.membershipStatus === 'active'}
        {#if data.access.canEdit || data.access.canManageMembers}
          <a
            href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}/settings`}
            class="btn btn-outline gap-2"><Shield class="size-4" /> Project settings</a
          >
        {/if}
        {#if !data.access.isMember && !form?.joined}
          <form method="POST" action="?/join">
            <button class="btn btn-primary gap-2"><Plus class="size-4" /> Join project</button>
          </form>
        {:else if data.access.isMember}
          <a
            href={`${data.dashboardOrigin}/projects/${encodeURIComponent(project.slug)}`}
            class="btn btn-outline gap-2">Open project workspace</a
          >
        {/if}
      {/if}
    </div>
  </div>

  {#if form?.joined}<p role="status">
      {form.requested ? 'Your join request has been sent.' : 'You have joined the project.'}
    </p>{/if}
  {#if form && 'message' in form}<p role="alert">{form.message}</p>{/if}
  <div class="prose max-w-none">
    <div class="text-base-content/80 mb-8 text-xl">
      <Markdown blocks={data.descriptionBlocks} {language} />
    </div>

    {#if project.tags?.length > 0}
      <div class="mb-8 flex gap-2">
        {#each project.tags as tag}
          <span class="badge badge-neutral">{tag}</span>
        {/each}
      </div>
    {/if}

    {#each project.sections as section}
      {#if section === 'main-article' && project.mainArticle}
        <section class="my-10">
          <h2 class="section-heading text-2xl font-semibold">{project.mainArticle.title}</h2>
          <Markdown blocks={data.mainArticleBlocks} {language} />
        </section>
      {:else if section === 'articles'}
        <section class="my-10">
          <h2 class="section-heading text-2xl font-semibold">Articles</h2>
          <ArticleList articles={project.articles} />
        </section>
      {:else if section === 'leaders' || section === 'members'}
        <section class="my-10">
          <h2 class="section-heading text-2xl font-semibold">
            {section === 'leaders' ? 'Project leaders' : 'Members'}
          </h2>
          <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {#each section === 'leaders' ? project.leaders : project.members as member}
              <div class="border-base-content/20 rounded border px-4 py-4">
                <MemberPreview
                  {member}
                  href={`/members/${encodeURIComponent(member.id)}`}
                  {language}
                />
              </div>
            {/each}
          </div>
        </section>
      {:else if section === 'links'}
        <section class="my-10">
          <h2 class="section-heading text-2xl font-semibold">Links</h2>
          <div class="flex flex-wrap gap-3">
            {#each project.links as link}<a
                class="btn btn-outline"
                href={link.url}
                rel="noopener noreferrer">{link.label}</a
              >{/each}
          </div>
        </section>
      {/if}
    {/each}
  </div>
</div>

<style>
  .section-heading {
    margin-bottom: 24px;
  }
</style>
