<script lang="ts">
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import { invalidateAll } from '$app/navigation';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { Project, ProjectAccess } from '$lib/types';
  import { ArrowUpRight, Pencil } from '@lucide/svelte';

  let {
    workspace,
    project,
    access,
    language,
    websiteOrigin
  }: {
    workspace: Workspace;
    project: Project | null;
    access: ProjectAccess;
    language: 'pl' | 'en';
    websiteOrigin: string;
  } = $props();

  let busy = $state(false);
  let error = $state('');

  const name = $derived(workspace === 'project' ? (project?.name ?? 'Project') : 'Association');
  const projectSlug = $derived(project?.slug ?? '');

  async function join() {
    if (!project || busy) return;
    busy = true;
    error = '';
    try {
      await api(`/platform/projects/${project.id}/join`, 'POST');
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <div>
    <h1>{name}</h1>
    {#if project}
      <a
        class="btn btn-outline"
        href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
        ><ArrowUpRight size={15} />{'View public project'}</a
      >
    {/if}
    {#if project?.description}
      <div class="workspace-description">
        <MarkdownContent value={project.description} {language} />
      </div>
    {:else}
      <p class="workspace-description">
        {'Shared tasks, conversations, and publications in one place.'}
      </p>
    {/if}
  </div>
  {#if project}
    <div class="row">
      {#if access.canEdit || access.canManageMembers}
        <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'settings')}
          ><Pencil size={15} />{'Project settings'}</a
        >
      {/if}
      {#if !access.isMember}
        <button class="btn btn-outline" disabled={busy} onclick={join}>{'Join project'}</button>
      {/if}
    </div>
  {/if}
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if workspace === 'project' && access.canEdit}
  <p class="muted project-article-help">
    {'To choose the article displayed on the public project home page, open an article, enable “Main project article”, and publish it.'}
    <a href={dashboardPath(workspace, projectSlug, 'articles')}>{'Manage articles'}</a>
  </p>
{/if}
<div class="workspace-shortcuts">
  {#each [['board', 'Kanban', 'Plan and track shared tasks.'], ['forum', 'Forum', 'Discuss, ask questions, and share ideas.'], ['articles', 'Articles', 'Write publications and propose changes.']] as [key, label, description]}
    <a class="workspace-shortcut" href={dashboardPath(workspace, projectSlug, key)}
      ><span class="shortcut-heading">{label}<ArrowUpRight size={16} aria-hidden="true" /></span
      ><span>{description}</span></a
    >
  {/each}
</div>

<style>
  .project-article-help {
    margin-bottom: 20px;
    max-width: 80ch;
  }
  .project-article-help a {
    margin-left: 6px;
    text-decoration: underline;
  }
</style>
