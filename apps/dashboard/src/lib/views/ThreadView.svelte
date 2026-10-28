<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import ContentHistory from '$lib/ContentHistory.svelte';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import ThreadActivity from '$lib/ThreadActivity.svelte';
  import ThreadAside from '$lib/ThreadAside.svelte';
  import DetailLayout from '$lib/DetailLayout.svelte';
  import { api, errorMessage } from '$lib/api';
  import { TIMELINE_CHUNK, TIMELINE_INITIAL, TIMELINE_TAIL } from '$lib/timeline';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { AssignmentMember, Comment, Thread, ThreadEvent } from '$lib/types';
  import { MessagesSquare, Pencil, RotateCcw, Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    thread,
    members,
    events,
    eventsNextPage,
    eventsError,
    language,
    canManage,
    userId,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    thread: Thread;
    members: AssignmentMember[];
    events: ThreadEvent[];
    eventsNextPage: number | null;
    eventsError: boolean;
    language: 'pl' | 'en';
    canManage: boolean;
    userId: string;
    refresh: () => Promise<void>;
  } = $props();

  const DATE_LOCALES = { pl: 'pl-PL', en: 'en-GB' } as const;
  const dateLocale = $derived(DATE_LOCALES[language]);

  let busy = $state(false);
  let error = $state('');
  let reply = $state('');
  let timelineHead = $state(TIMELINE_INITIAL);
  let nextPage = $state<number | null>(untrack(() => eventsNextPage));
  let allEvents = $state<ThreadEvent[]>(untrack(() => events));
  let activityLoading = $state(false);
  let loadActivityError = $state(untrack(() => eventsError));
  let editingCommentId = $state<string | null>(null);
  let editingCommentMarkdown = $state('');
  let pendingCommentDelete = $state<string | null>(null);
  let now = $state(Date.now());

  const archived = $derived(!!thread.archivedAt);
  const comments = $derived(thread.comments ?? []);
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
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString(dateLocale);
  const relativeDateTime = (iso: string) => {
    const seconds = (new Date(iso).getTime() - now) / 1000;
    const abs = Math.abs(seconds);
    const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] =
      abs < 60
        ? [1, 'second']
        : abs < 3600
          ? [60, 'minute']
          : abs < 86400
            ? [3600, 'hour']
            : abs < 604800
              ? [86400, 'day']
              : abs < 2592000
                ? [604800, 'week']
                : abs < 31536000
                  ? [2592000, 'month']
                  : [31536000, 'year'];
    return new Intl.RelativeTimeFormat(dateLocale, { numeric: 'auto' }).format(
      abs < 60 ? 0 : Math.trunc(seconds / divisor),
      unit
    );
  };

  const timeline = $derived(
    [
      ...comments.map((comment, index) => ({
        kind: 'comment' as const,
        id: comment.id,
        createdAt: comment.createdAt ?? '',
        comment,
        first: index === 0
      })),
      ...allEvents
        .filter((event) => event.action !== 'threads.created' && event.action !== 'comments.edited')
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
    const incoming = events;
    allEvents = [
      ...new Map(
        [...untrack(() => allEvents), ...incoming].map((event) => [event.id, event])
      ).values()
    ];
    if (eventsError) loadActivityError = true;
  });

  $effect(() => {
    void thread.id;
    timelineHead = TIMELINE_INITIAL;
    editingCommentId = null;
    reply = '';
    nextPage = eventsNextPage;
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
    let merged: ThreadEvent[] = allEvents;
    let failed = false;
    for (let count = 0; page !== null && count < 50; count++) {
      try {
        const result: ThreadEvent[] = await api<ThreadEvent[]>(
          `/platform/threads/${encodeURIComponent(thread.id)}/activity?page=${page}`
        );
        merged = [...new Map([...merged, ...result].map((event) => [event.id, event])).values()];
        page = result.length === 20 ? page + 1 : null;
      } catch {
        failed = true;
        break;
      }
    }
    allEvents = merged;
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
      api(`/platform/threads/${encodeURIComponent(thread.id)}`, 'PATCH', {
        version: thread.version,
        title
      })
    );
  }

  function submitReply() {
    if (!reply.trim()) return;
    void run(async () => {
      await api(`/platform/threads/${encodeURIComponent(thread.id)}/comments`, 'POST', {
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
  backHref={dashboardPath(workspace, projectSlug, 'forum')}
  backLabel={'All threads'}
  title={thread.title}
  referenceNumber={thread.referenceNumber}
  canEditTitle={(canManage || thread.authorId === userId) && !archived}
  {busy}
  onSaveTitle={saveTitle}
>
  {#snippet aside()}
    <ThreadAside {thread} {members} {language} {canManage} {refresh} />
  {/snippet}

  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if archived}<p class="notice">This thread is archived.</p>{/if}

  <section class="issue-discussion" aria-label={'Discussion'}>
    <div class="discussion-timeline">
      {#each visibleTimeline as entry (`${entry.kind}-${entry.id}`)}
        {#if entry.kind === 'event'}
          <ThreadActivity event={entry.event} {members} {language} {now} />
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
                {language}
              />
            </div>
            <div class="comment-card">
              <header class="comment-header">
                <a class="comment-author" href={`/members/${encodeURIComponent(author.id)}`}
                  >{#if memberName(author)}{memberName(author)}{:else}Association member{/if}</a
                >
                <span class="comment-verb"
                  >{#if entry.first}opened this thread{:else}commented{/if}</span
                >
                <time
                  datetime={comment.createdAt}
                  title={formatDateTime(comment.createdAt)}
                  aria-label={formatDateTime(comment.createdAt)}
                  >{relativeDateTime(comment.createdAt)}</time
                >
                <div class="comment-actions">
                  {#if comment.edited}
                    <ContentHistory kind="comment" targetId={comment.id} {language} />
                  {/if}
                  {#if !archived && (comment.authorId === userId || canManage)}
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
                    <Editor
                      {language}
                      bind:value={editingCommentMarkdown}
                      rows={4}
                      allowReferences
                    />
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
                  <MarkdownContent value={comment.markdown} {language} allowReferences />
                {/if}
              </div>
            </div>
          </article>
        {/if}
      {/each}
    </div>

    {#if !archived}
      <form
        class="issue-reply"
        onsubmit={(event) => {
          event.preventDefault();
          submitReply();
        }}
      >
        <h2><MessagesSquare size={17} aria-hidden="true" />{'Reply'}</h2>
        <Editor {language} bind:value={reply} rows={4} allowReferences />
        <button class="btn" disabled={busy || !reply.trim()}>Reply</button>
      </form>
    {/if}
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
