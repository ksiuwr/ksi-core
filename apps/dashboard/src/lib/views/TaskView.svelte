<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime as formatDateTimeValue, formatRelativeTime } from 'shared/format';
  import { onMount, untrack } from 'svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import ContentHistory from '$lib/ContentHistory.svelte';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import TaskActivity from '$lib/TaskActivity.svelte';
  import TaskAside from '$lib/TaskAside.svelte';
  import DetailLayout from '$lib/DetailLayout.svelte';
  import { api, errorMessage } from '$lib/api';
  import { TIMELINE_CHUNK, TIMELINE_INITIAL, TIMELINE_TAIL } from '$lib/timeline';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type {
    AssignmentMember,
    BoardData,
    BoardLabel,
    Comment,
    Item,
    ThreadEvent
  } from '$lib/types';
  import { MessagesSquare, Pencil, RotateCcw, Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    item,
    board,
    members,
    comments,
    activity,
    activityNextPage,
    activityError,
    canManage,
    userId,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    item: Item;
    board: BoardData | null;
    members: AssignmentMember[];
    comments: Comment[];
    activity: ThreadEvent[];
    activityNextPage: number | null;
    activityError: boolean;
    canManage: boolean;
    userId: string;
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');
  let reply = $state('');
  let timelineHead = $state(TIMELINE_INITIAL);
  let nextPage = $state<number | null>(untrack(() => activityNextPage));
  let allActivity = $state<ThreadEvent[]>(untrack(() => activity));
  let activityLoading = $state(false);
  let loadActivityError = $state(untrack(() => activityError));
  let descriptionEditing = $state(false);
  let descriptionDraft = $state('');
  let editingCommentId = $state<string | null>(null);
  let editingCommentMarkdown = $state('');
  let pendingCommentDelete = $state<string | null>(null);
  let now = $state(Date.now());

  const statuses = $derived(board?.statuses ?? []);
  const labels = $derived<BoardLabel[]>(
    (board?.labels ?? []).map((label) =>
      typeof label === 'string'
        ? { name: label, color: '#6b7280' }
        : { name: label.name, color: label.color || '#6b7280', description: label.description }
    )
  );
  const labelMap = $derived(new Map(labels.map((label) => [label.name, label])));
  const creatorName = $derived(
    allActivity.find((event) => event.action === 'kanban.created')?.authorName ?? null
  );
  const memberFor = (id?: string | null, name?: string | null): AssignmentMember => {
    const found = id ? members.find((member) => member.id === id) : undefined;
    if (found) return found;
    return {
      id: id ?? '',
      firstName: name ?? '',
      lastName: '',
      nickname: null,
      image: null,
      bio: null
    };
  };
  const memberName = (member: AssignmentMember) =>
    [member.firstName, member.lastName].filter(Boolean).join(' ') || member.nickname || '';
  const formatDateTime = (iso: string) => formatDateTimeValue(iso, language);
  const relativeDateTime = (iso: string) => formatRelativeTime(iso, language, now);

  const timeline = $derived(
    [
      {
        kind: 'description' as const,
        id: `description-${item.id}`,
        createdAt: item.createdAt ?? '',
        item
      },
      ...comments.map((comment) => ({
        kind: 'comment' as const,
        id: comment.id,
        createdAt: comment.createdAt,
        comment
      })),
      ...allActivity
        .filter((event) => event.action !== 'kanban.created')
        .map((event) => ({
          kind: 'event' as const,
          id: event.id,
          createdAt: event.createdAt,
          event
        }))
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  );
  const hiddenTimelineItems = $derived(Math.max(0, timeline.length - TIMELINE_TAIL - timelineHead));
  const showTimelineGap = $derived(hiddenTimelineItems > 0 || nextPage !== null);
  const remainingTimelineLabel = $derived(`${hiddenTimelineItems} remaining items`);
  const visibleTimeline = $derived.by(() => {
    if (!showTimelineGap) return timeline;
    const tailStart = Math.max(timelineHead, timeline.length - TIMELINE_TAIL);
    return [
      ...timeline.slice(0, timelineHead),
      { kind: 'gap' as const, id: 'timeline-gap', createdAt: '' },
      ...timeline.slice(tailStart)
    ];
  });

  $effect(() => {
    const incoming = activity;
    allActivity = [
      ...new Map(
        [...untrack(() => allActivity), ...incoming].map((event) => [event.id, event])
      ).values()
    ];
    if (activityError) loadActivityError = true;
  });

  $effect(() => {
    void item.id;
    timelineHead = TIMELINE_INITIAL;
    descriptionEditing = false;
    editingCommentId = null;
    reply = '';
    nextPage = activityNextPage;
  });

  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 60000);
    return () => clearInterval(timer);
  });

  onMount(() => {
    void loadAllActivity();
  });

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await work();
      await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  async function loadAllActivity() {
    if (nextPage === null || activityLoading) return;
    activityLoading = true;
    loadActivityError = false;
    let page: number | null = nextPage;
    let merged: ThreadEvent[] = allActivity;
    let failed = false;
    for (let count = 0; page !== null && count < 50; count++) {
      try {
        const events: ThreadEvent[] = await api<ThreadEvent[]>(
          `/platform/items/${encodeURIComponent(item.id)}/activity?page=${page}`
        );
        merged = [...new Map([...merged, ...events].map((event) => [event.id, event])).values()];
        page = events.length === 20 ? page + 1 : null;
      } catch {
        failed = true;
        break;
      }
    }
    allActivity = merged;
    nextPage = page;
    loadActivityError = failed;
    activityLoading = false;
  }

  async function revealTimeline() {
    if (loadActivityError && nextPage !== null) {
      await loadAllActivity();
      return;
    }
    if (hiddenTimelineItems > 0) {
      timelineHead = Math.min(timeline.length - TIMELINE_TAIL, timelineHead + TIMELINE_CHUNK);
      return;
    }
    if (nextPage === null || activityLoading) return;
    await loadAllActivity();
    timelineHead = Math.min(
      Math.max(timeline.length - TIMELINE_TAIL, 1),
      timelineHead + TIMELINE_CHUNK
    );
  }

  function saveTitle(title: string) {
    return run(() =>
      api(`/platform/items/${encodeURIComponent(item.id)}`, 'PATCH', {
        version: item.version,
        title
      })
    );
  }

  function startDescriptionEdit() {
    if (busy) return;
    descriptionDraft = item.markdown;
    descriptionEditing = true;
  }

  function saveDescription() {
    if (!descriptionEditing) return;
    const next = descriptionDraft;
    descriptionEditing = false;
    if (next === item.markdown) return;
    void run(() =>
      api(`/platform/items/${encodeURIComponent(item.id)}`, 'PATCH', {
        version: item.version,
        markdown: next
      })
    );
  }

  function submitReply() {
    if (!reply.trim()) return;
    void run(async () => {
      await api(`/platform/items/${encodeURIComponent(item.id)}/comments`, 'POST', {
        markdown: reply
      });
      reply = '';
    });
  }

  function saveCommentEdit(id: string) {
    void run(async () => {
      await api(`/platform/comments/${encodeURIComponent(id)}`, 'PATCH', {
        markdown: editingCommentMarkdown
      });
      editingCommentId = null;
      editingCommentMarkdown = '';
    });
  }

  function deleteComment() {
    const id = pendingCommentDelete;
    if (!id) return;
    pendingCommentDelete = null;
    void run(() => api(`/platform/comments/${encodeURIComponent(id)}`, 'DELETE'));
  }
</script>

<DetailLayout
  backHref={dashboardPath(workspace, projectSlug, 'board')}
  backLabel={'Back to board'}
  title={item.title}
  referenceNumber={item.referenceNumber}
  canEditTitle={true}
  {busy}
  onSaveTitle={saveTitle}
>
  {#snippet aside()}
    <TaskAside {workspace} {projectSlug} {item} {labels} {members} {refresh} />
  {/snippet}

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <section class="issue-discussion" aria-label={'Discussion'}>
    <div class="discussion-timeline">
      {#each visibleTimeline as entry (`${entry.kind}-${entry.id}`)}
        {#if entry.kind === 'event'}
          <TaskActivity event={entry.event} {statuses} {labels} {members} {now} />
        {:else if entry.kind === 'gap'}
          <div class="timeline-gap">
            {#if hiddenTimelineItems > 0}<p class="timeline-gap-count">
                {remainingTimelineLabel}
              </p>{/if}
            {#if loadActivityError}<p class="timeline-gap-error" role="alert">
                Could not load activity.
              </p>{/if}
            <button
              type="button"
              class="timeline-load"
              disabled={activityLoading}
              onclick={() => void revealTimeline()}
            >
              {#if loadActivityError}<RotateCcw size={13} aria-hidden="true" />{/if}
              {#if activityLoading}Loading…{:else if loadActivityError}Try again{:else}Load more{/if}
            </button>
          </div>
        {:else if entry.kind === 'description'}
          {@const author = memberFor(entry.item.authorId, creatorName)}
          <article class="timeline-comment">
            <div class="comment-avatar">
              <MemberPreview
                member={author}
                href={`/members/${encodeURIComponent(author.id)}`}
                avatarOnly
                size={32}
              />
            </div>
            <div class="comment-card">
              <header class="comment-header">
                <a class="comment-author" href={`/members/${encodeURIComponent(author.id)}`}
                  >{#if memberName(author)}{memberName(author)}{:else}Association member{/if}</a
                >
                <span class="comment-verb">opened this task</span>
                {#if entry.createdAt}<time
                    datetime={entry.createdAt}
                    title={formatDateTime(entry.createdAt)}
                    aria-label={formatDateTime(entry.createdAt)}
                    >{relativeDateTime(entry.createdAt)}</time
                  >{/if}
                <div class="comment-actions">
                  {#if !descriptionEditing}
                    <button
                      type="button"
                      class="icon-action-btn"
                      title={'Edit description'}
                      aria-label={'Edit description'}
                      disabled={busy}
                      onclick={startDescriptionEdit}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                  {/if}
                </div>
              </header>
              <div class="comment-body">
                {#if descriptionEditing}
                  <form
                    class="issue-reply"
                    onsubmit={(event) => {
                      event.preventDefault();
                      saveDescription();
                    }}
                  >
                    <Editor bind:value={descriptionDraft} rows={6} allowReferences />
                    <div class="comment-composer-actions">
                      <button class="btn" disabled={busy || !descriptionDraft.trim()}>Save</button>
                      <button
                        type="button"
                        class="btn btn-outline"
                        onclick={() => (descriptionEditing = false)}>Cancel</button
                      >
                    </div>
                  </form>
                {:else if entry.item.markdown.trim()}
                  <MarkdownContent value={entry.item.markdown} allowReferences />
                {:else}
                  <p class="issue-empty">No description.</p>
                {/if}
              </div>
            </div>
          </article>
        {:else}
          {@const comment = entry.comment}
          {@const author = memberFor(comment.authorId, comment.authorName)}
          <article class="timeline-comment">
            <div class="comment-avatar">
              <MemberPreview
                member={author}
                href={`/members/${encodeURIComponent(author.id)}`}
                avatarOnly
                size={32}
              />
            </div>
            <div class="comment-card">
              <header class="comment-header">
                <a class="comment-author" href={`/members/${encodeURIComponent(author.id)}`}
                  >{#if memberName(author)}{memberName(author)}{:else}Association member{/if}</a
                >
                <span class="comment-verb">commented</span>
                <time
                  datetime={comment.createdAt}
                  title={formatDateTime(comment.createdAt)}
                  aria-label={formatDateTime(comment.createdAt)}
                  >{relativeDateTime(comment.createdAt)}</time
                >
                <div class="comment-actions">
                  {#if comment.edited}
                    <ContentHistory kind="comment" targetId={comment.id} />
                  {/if}
                  {#if comment.authorId === userId || canManage}
                    <button
                      type="button"
                      class="icon-action-btn"
                      title="Edit"
                      onclick={() => {
                        editingCommentId = comment.id;
                        editingCommentMarkdown = comment.markdown;
                      }}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      class="icon-action-btn danger"
                      title="Delete"
                      onclick={() => (pendingCommentDelete = comment.id)}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  {/if}
                </div>
              </header>
              <div class="comment-body">
                {#if editingCommentId === comment.id}
                  <form
                    class="issue-reply"
                    onsubmit={(event) => {
                      event.preventDefault();
                      saveCommentEdit(comment.id);
                    }}
                  >
                    <Editor bind:value={editingCommentMarkdown} rows={4} allowReferences />
                    <div class="comment-composer-actions">
                      <button class="btn" disabled={busy || !editingCommentMarkdown.trim()}
                        >Save</button
                      >
                      <button
                        type="button"
                        class="btn ghost"
                        onclick={() => (editingCommentId = null)}>Cancel</button
                      >
                    </div>
                  </form>
                {:else}
                  <MarkdownContent value={comment.markdown} allowReferences />
                {/if}
              </div>
            </div>
          </article>
        {/if}
      {/each}
    </div>

    <form
      class="issue-reply"
      onsubmit={(event) => {
        event.preventDefault();
        submitReply();
      }}
    >
      <h2><MessagesSquare size={17} aria-hidden="true" />{'Add to discussion'}</h2>
      <Editor bind:value={reply} rows={4} allowReferences />
      <button class="btn" disabled={busy || !reply.trim()}>Comment</button>
    </form>
  </section>
</DetailLayout>

<ConfirmDialog
  open={pendingCommentDelete !== null}
  title={'Delete comment?'}
  message={'This action cannot be undone.'}
  confirmLabel={'Delete'}
  cancelLabel={'Cancel'}
  {busy}
  onconfirm={deleteComment}
  onclose={() => (pendingCommentDelete = null)}
/>

<style>
  .issue-discussion {
    padding-top: 4px;
  }
  .issue-reply h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
  }
</style>
