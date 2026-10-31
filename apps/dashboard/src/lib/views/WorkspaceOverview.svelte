<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { invalidateAll } from '$app/navigation';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, threadPath, type Workspace } from '$lib/navigation';
  import { statusColor } from '$lib/status-color';
  import type {
    AssignmentMember,
    BoardData,
    Item,
    Project,
    ProjectAccess,
    Thread
  } from '$lib/types';
  import {
    ArrowUpRight,
    BookOpen,
    Columns3,
    FileText,
    MessagesSquare,
    Pencil,
    Users
  } from '@lucide/svelte';

  let {
    workspace,
    project,
    access,
    websiteOrigin,
    board,
    items,
    threads,
    threadCount,
    members,
    articleCount,
    docCount
  }: {
    workspace: Workspace;
    project: Project | null;
    access: ProjectAccess;
    websiteOrigin: string;
    board: BoardData | null;
    items: Item[];
    threads: Thread[];
    threadCount: number;
    members: AssignmentMember[];
    articleCount: number;
    docCount: number;
  } = $props();
  const language = $derived(preferences.language);

  const MEMBER_AVATARS = 14;
  const LATEST_TASKS = 6;

  let busy = $state(false);
  let error = $state('');

  const name = $derived(workspace === 'project' ? (project?.name ?? 'Projekt') : 'Całe koło');
  const projectSlug = $derived(project?.slug ?? '');
  const statuses = $derived(board?.statuses ?? []);
  const statusFor = (column: string) => statuses.find((status) => status.id === column);
  const latestTasks = $derived(
    [...items]
      .sort((a, b) => (b.referenceNumber ?? 0) - (a.referenceNumber ?? 0))
      .slice(0, LATEST_TASKS)
  );
  const path = (tab: string) => dashboardPath(workspace, projectSlug, tab);

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

<header class="workspace-header">
  <div>
    <h1>{name}</h1>
    {#if project?.fields?.length}
      <div class="chip-row">
        {#each project.fields as field (field)}<span class="tag">{field}</span>{/each}
      </div>
    {/if}
  </div>
  <div class="row">
    {#if project}
      <a
        class="btn btn-outline"
        href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
        ><ArrowUpRight size={15} aria-hidden="true" />Zobacz publiczny projekt</a
      >
    {/if}
    {#if project && (access.canEdit || access.canManageMembers)}
      <a class="btn btn-outline" href={path('settings')}
        ><Pencil size={15} aria-hidden="true" />Ustawienia projektu</a
      >
    {/if}
    {#if project && !access.isMember}
      <button class="btn" disabled={busy} onclick={join}>Dołącz do projektu</button>
    {/if}
  </div>
</header>
{#if error}<p class="error" role="alert">{error}</p>{/if}

<div class="detail-layout">
  <div class="detail-main overview-main">
    {#if project?.description}
      <section class="card overview-about">
        <MarkdownContent value={project.description} />
      </section>
    {/if}

    <section class="overview-section">
      <header class="section-bar">
        <h2>Najnowsze zadania</h2>
        <a href={path('board')}>Zobacz tablicę</a>
      </header>
      {#if latestTasks.length}
        <ul class="list-group">
          {#each latestTasks as item (item.id)}
            {@const status = statusFor(item.column)}
            <li>
              <a
                class="list-row"
                href={taskPath(workspace, projectSlug, item.referenceNumber ?? item.id)}
              >
                <span class="status-dot" style:--dot={statusColor(status)} aria-hidden="true"
                ></span>
                <span class="list-row-title">{item.title}</span>
                {#if item.referenceNumber}<span class="list-row-ref">#{item.referenceNumber}</span
                  >{/if}
                {#if status}<span class="list-row-meta">{status.name}</span>{/if}
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="list-empty">Brak zadań.</p>
      {/if}
    </section>

    <section class="overview-section">
      <header class="section-bar">
        <h2>Ostatnie dyskusje</h2>
        <a href={path('forum')}>Wszystkie wątki</a>
      </header>
      {#if threads.length}
        <ul class="list-group">
          {#each threads as thread (thread.id)}
            <li>
              <a
                class="list-row"
                href={threadPath(workspace, projectSlug, thread.referenceNumber ?? thread.id)}
              >
                <MessagesSquare size={15} aria-hidden="true" />
                <span class="list-row-title">{thread.title}</span>
                {#if thread.referenceNumber}<span class="list-row-ref"
                    >#{thread.referenceNumber}</span
                  >{/if}
                {#if thread.createdAt}<time class="list-row-meta" datetime={thread.createdAt}
                    >{formatDate(thread.createdAt, language)}</time
                  >{/if}
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="list-empty">Brak wątków.</p>
      {/if}
    </section>
  </div>

  <aside class="detail-aside">
    <section class="aside-section">
      <h2>Przeglądaj</h2>
      <ul class="nav-list">
        <li>
          <a href={path('board')}
            ><Columns3 size={15} aria-hidden="true" /><span>Kanban</span><b>{items.length}</b></a
          >
        </li>
        <li>
          <a href={path('forum')}
            ><MessagesSquare size={15} aria-hidden="true" /><span>Forum</span><b>{threadCount}</b
            ></a
          >
        </li>
        <li>
          <a href={path('articles')}
            ><FileText size={15} aria-hidden="true" /><span>Artykuły</span><b>{articleCount}</b></a
          >
        </li>
        <li>
          <a href={path('docs')}
            ><BookOpen size={15} aria-hidden="true" /><span>Dokumentacja</span><b>{docCount}</b></a
          >
        </li>
        <li>
          <a href={path('roster')}
            ><Users size={15} aria-hidden="true" /><span>Członkowie</span><b>{members.length}</b></a
          >
        </li>
      </ul>
    </section>

    {#if members.length}
      <section class="aside-section">
        <h2>Członkowie</h2>
        <div class="avatar-row">
          {#each members.slice(0, MEMBER_AVATARS) as member (member.id)}
            <MemberPreview
              {member}
              href={`/members/${encodeURIComponent(member.id)}`}
              avatarOnly
              size={30}
            />
          {/each}
        </div>
        {#if members.length > MEMBER_AVATARS}
          <a class="muted" href={path('roster')}
            >Pokaż więcej (+{members.length - MEMBER_AVATARS})</a
          >
        {/if}
      </section>
    {/if}

    {#if workspace === 'project' && access.canEdit}
      <section class="aside-section">
        <h2>Strona publiczna</h2>
        <p class="muted">
          Aby wybrać artykuł wyświetlany na publicznej stronie projektu, otwórz artykuł, zaznacz
          „Główny artykuł projektu” i opublikuj go.
        </p>
        <a class="btn btn-outline btn-sm" href={path('articles')}>Zarządzaj artykułami</a>
      </section>
    {/if}
  </aside>
</div>
