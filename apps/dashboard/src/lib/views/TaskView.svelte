<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime as formatDateTimeValue, formatRelativeTime } from 'shared/format';
  import { onMount, untrack } from 'svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import ContentHistory from '$lib/ContentHistory.svelte';
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
  import {
    AlertDialog,
    Banner,
    Button,
    Card,
    Heading,
    HStack,
    IconButton,
    Link,
    Text,
    VStack
  } from '@astryx-sv/core';
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
  const remainingTimelineLabel = $derived(`Pozostało: ${hiddenTimelineItems}`);
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
  backLabel={'Wróć do tablicy'}
  title={item.title}
  referenceNumber={item.referenceNumber}
  canEditTitle={true}
  {busy}
  onSaveTitle={saveTitle}
>
  {#snippet aside()}
    <TaskAside {workspace} {projectSlug} {item} {labels} {members} {refresh} />
  {/snippet}

  <VStack gap={4}>
    {#if error}<Banner status="error" title={error} role="alert" />{/if}

    <VStack as="section" gap={4} aria-label={'Dyskusja'}>
      <VStack gap={3} class="discussion-timeline">
        {#each visibleTimeline as entry (`${entry.kind}-${entry.id}`)}
          {#if entry.kind === 'event'}
            <TaskActivity event={entry.event} {statuses} {labels} {members} {now} />
          {:else if entry.kind === 'gap'}
            <VStack gap={2} hAlign="center" paddingBlock={3}>
              {#if hiddenTimelineItems > 0}
                <Text weight="semibold">{remainingTimelineLabel}</Text>
              {/if}
              {#if loadActivityError}
                <Text as="p" type="supporting" role="alert">Nie udało się wczytać aktywności.</Text>
              {/if}
              {#if loadActivityError}
                <Button
                  variant="secondary"
                  size="sm"
                  label="Spróbuj ponownie"
                  isDisabled={activityLoading}
                  onclick={() => void revealTimeline()}
                >
                  {#snippet icon()}<RotateCcw size={13} aria-hidden="true" />{/snippet}
                </Button>
              {:else}
                <Button
                  variant="secondary"
                  size="sm"
                  label={activityLoading ? 'Wczytywanie…' : 'Wczytaj więcej'}
                  isDisabled={activityLoading}
                  onclick={() => void revealTimeline()}
                />
              {/if}
            </VStack>
          {:else if entry.kind === 'description'}
            {@const author = memberFor(entry.item.authorId, creatorName)}
            <HStack gap={3} vAlign="start">
              <HStack width={32} hAlign="center" vAlign="start" class="comment-avatar">
                <MemberPreview
                  member={author}
                  href={`/members/${encodeURIComponent(author.id)}`}
                  avatarOnly
                  size={32}
                />
              </HStack>
              <Card padding={0} width="100%">
                <VStack gap={0}>
                  <HStack gap={1.5} vAlign="center" wrap="wrap" class="comment-header">
                    <Link
                      href={`/members/${encodeURIComponent(author.id)}`}
                      type="inherit"
                      color="primary"
                      weight="semibold"
                    >
                      {#if memberName(author)}{memberName(author)}{:else}Członek koła{/if}
                    </Link>
                    <Text type="supporting">utworzył(a) to zadanie</Text>
                    {#if entry.createdAt}
                      <Text type="supporting">
                        <time
                          datetime={entry.createdAt}
                          title={formatDateTime(entry.createdAt)}
                          aria-label={formatDateTime(entry.createdAt)}
                          >{relativeDateTime(entry.createdAt)}</time
                        >
                      </Text>
                    {/if}
                    <HStack gap={1} class="comment-actions">
                      {#if !descriptionEditing}
                        <IconButton
                          label="Edytuj opis"
                          tooltip="Edytuj opis"
                          variant="ghost"
                          size="sm"
                          isDisabled={busy}
                          onclick={startDescriptionEdit}
                        >
                          {#snippet icon()}<Pencil size={13} aria-hidden="true" />{/snippet}
                        </IconButton>
                      {/if}
                    </HStack>
                  </HStack>
                  <VStack gap={3} padding={4}>
                    {#if descriptionEditing}
                      <form
                        onsubmit={(event) => {
                          event.preventDefault();
                          saveDescription();
                        }}
                      >
                        <VStack gap={3}>
                          <Editor bind:value={descriptionDraft} rows={6} allowReferences />
                          <HStack gap={2}>
                            <Button
                              type="submit"
                              variant="primary"
                              label="Zapisz"
                              isDisabled={busy || !descriptionDraft.trim()}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              label="Anuluj"
                              onclick={() => (descriptionEditing = false)}
                            />
                          </HStack>
                        </VStack>
                      </form>
                    {:else if entry.item.markdown.trim()}
                      <MarkdownContent value={entry.item.markdown} allowReferences />
                    {:else}
                      <Text as="p" type="supporting">Brak opisu.</Text>
                    {/if}
                  </VStack>
                </VStack>
              </Card>
            </HStack>
          {:else}
            {@const comment = entry.comment}
            {@const author = memberFor(comment.authorId, comment.authorName)}
            <HStack gap={3} vAlign="start">
              <HStack width={32} hAlign="center" vAlign="start" class="comment-avatar">
                <MemberPreview
                  member={author}
                  href={`/members/${encodeURIComponent(author.id)}`}
                  avatarOnly
                  size={32}
                />
              </HStack>
              <Card padding={0} width="100%">
                <VStack gap={0}>
                  <HStack gap={1.5} vAlign="center" wrap="wrap" class="comment-header">
                    <Link
                      href={`/members/${encodeURIComponent(author.id)}`}
                      type="inherit"
                      color="primary"
                      weight="semibold"
                    >
                      {#if memberName(author)}{memberName(author)}{:else}Członek koła{/if}
                    </Link>
                    <Text type="supporting">skomentował(a)</Text>
                    <Text type="supporting">
                      <time
                        datetime={comment.createdAt}
                        title={formatDateTime(comment.createdAt)}
                        aria-label={formatDateTime(comment.createdAt)}
                        >{relativeDateTime(comment.createdAt)}</time
                      >
                    </Text>
                    <HStack gap={1} class="comment-actions">
                      {#if comment.edited}
                        <ContentHistory kind="comment" targetId={comment.id} />
                      {/if}
                      {#if comment.authorId === userId || canManage}
                        <IconButton
                          label="Edytuj"
                          tooltip="Edytuj"
                          variant="ghost"
                          size="sm"
                          onclick={() => {
                            editingCommentId = comment.id;
                            editingCommentMarkdown = comment.markdown;
                          }}
                        >
                          {#snippet icon()}<Pencil size={13} aria-hidden="true" />{/snippet}
                        </IconButton>
                        <IconButton
                          label="Usuń"
                          tooltip="Usuń"
                          variant="ghost"
                          size="sm"
                          onclick={() => (pendingCommentDelete = comment.id)}
                        >
                          {#snippet icon()}<Trash2 size={13} aria-hidden="true" />{/snippet}
                        </IconButton>
                      {/if}
                    </HStack>
                  </HStack>
                  <VStack gap={3} padding={4}>
                    {#if editingCommentId === comment.id}
                      <form
                        onsubmit={(event) => {
                          event.preventDefault();
                          saveCommentEdit(comment.id);
                        }}
                      >
                        <VStack gap={3}>
                          <Editor bind:value={editingCommentMarkdown} rows={4} allowReferences />
                          <HStack gap={2}>
                            <Button
                              type="submit"
                              variant="primary"
                              label="Zapisz"
                              isDisabled={busy || !editingCommentMarkdown.trim()}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              label="Anuluj"
                              onclick={() => (editingCommentId = null)}
                            />
                          </HStack>
                        </VStack>
                      </form>
                    {:else}
                      <MarkdownContent value={comment.markdown} allowReferences />
                    {/if}
                  </VStack>
                </VStack>
              </Card>
            </HStack>
          {/if}
        {/each}
      </VStack>

      <form
        onsubmit={(event) => {
          event.preventDefault();
          submitReply();
        }}
      >
        <VStack gap={3}>
          <HStack gap={1.5} vAlign="center">
            <MessagesSquare size={17} aria-hidden="true" />
            <Heading level={2}>Dodaj do dyskusji</Heading>
          </HStack>
          <Editor bind:value={reply} rows={4} allowReferences />
          <HStack>
            <Button
              type="submit"
              variant="primary"
              label="Komentarz"
              isDisabled={busy || !reply.trim()}
            />
          </HStack>
        </VStack>
      </form>
    </VStack>
  </VStack>
</DetailLayout>

<AlertDialog
  isOpen={pendingCommentDelete !== null}
  onOpenChange={(open) => {
    if (!open) pendingCommentDelete = null;
  }}
  title={'Usunąć komentarz?'}
  description={'Tej operacji nie można cofnąć.'}
  actionLabel={'Usuń'}
  cancelLabel={'Anuluj'}
  isActionLoading={busy}
  onAction={deleteComment}
/>
