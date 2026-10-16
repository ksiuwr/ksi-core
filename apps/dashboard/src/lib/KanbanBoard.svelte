<script lang="ts">
  import { tick } from 'svelte';
  import { Plus, X, Trash2, Pencil, Save, MessagesSquare, GripVertical } from '@lucide/svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  export type BoardStatus = { id: string; name: string; color?: string; deleted?: boolean };
  export type Item = {
    id: string;
    title: string;
    markdown: string;
    column: string;
    version: number;
    position: number;
    tags: string[];
    deletedAt?: string;
  };
  type Comment = {
    id: string;
    markdown: string;
    createdAt: string;
    authorName?: string;
    authorId?: string;
  };
  let {
    items,
    statuses,
    boardId,
    projectId,
    language,
    canManage = false,
    userId,
    activeItemId = null,
    refresh,
    reportError
  }: {
    items: Item[];
    statuses: BoardStatus[];
    boardId: string;
    projectId: string;
    language: 'pl' | 'en';
    canManage?: boolean;
    userId?: string;
    activeItemId?: string | null;
    refresh: () => Promise<void>;
    reportError: (error: string) => void;
  } = $props();

  const label = (s: BoardStatus) =>
    s.id === 'todo' && s.name === 'To do'
      ? 'To do'
      : s.id === 'progress' && s.name === 'In progress'
        ? 'In progress'
        : s.id === 'done' && s.name === 'Done'
          ? 'Done'
          : s.name;
  const color = (s: BoardStatus) =>
    s.color ?? { todo: '#8b8b8b', progress: '#d58a32', done: '#449a78' }[s.id] ?? '#8777b5';
  const activeStatuses = $derived(statuses.filter((s) => !s.deleted));
  let editingStatus = $state<BoardStatus | null>(null),
    statusDialog = $state<HTMLDialogElement>(),
    statusError = $state('');
  const options = $derived(
    activeStatuses.map((s) => ({ value: s.id, label: label(s), color: color(s) }))
  );
  let busy = $state(false),
    dragged = $state<string | null>(null),
    over = $state<string | null>(null);
  let mobileMoveItem = $state<Item | null>(null),
    mobileDropTarget = $state<string | null>(null);
  let touchPress: { item: Item; x: number; y: number } | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let suppressTaskClick: string | null = null;
  let composer = $state<string | null>(null),
    title = $state(''),
    markdown = $state(''),
    statusName = $state(''),
    addingStatus = $state(false),
    statusColor = $state('#8777b5'),
    composerDialog = $state<HTMLDialogElement>(),
    confirmingDelete = $state(false);
  let selected = $state<Item | null>(null),
    editing = $state(false),
    editTitle = $state(''),
    editMarkdown = $state(''),
    reply = $state('');
  let comments = $state<Comment[]>([]),
    commentsLoading = $state(false),
    editingCommentId = $state<string | null>(null),
    editingCommentMarkdown = $state(''),
    dialog = $state<HTMLDialogElement>();
  let lastTrigger: HTMLElement | null = null,
    detailGeneration = 0;
  async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let result: any = {};
    if (text)
      try {
        result = JSON.parse(text);
      } catch {}
    if (!response.ok) throw new Error(result?.code ?? result?.message ?? 'Request failed.');
    return result;
  }
  async function run(work: () => Promise<void>) {
    busy = true;
    reportError('');
    try {
      await work();
      await refresh();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      busy = false;
    }
  }
  async function ensureBoard() {
    if (boardId) return boardId;
    return (await api<{ id: string }>('/platform/boards', 'POST', projectId ? { projectId } : {}))
      .id;
  }
  async function openComposer(column: string) {
    composer = column;
    title = '';
    markdown = '';
    await tick();
    composerDialog?.showModal();
    document.getElementById('task-title')?.focus();
  }
  function closeComposer() {
    const column = composer;
    composerDialog?.close();
    composer = null;
    document.getElementById(`add-${column}`)?.focus();
  }
  async function openStatus(status: BoardStatus, event: MouseEvent) {
    lastTrigger = event.currentTarget as HTMLElement;
    editingStatus = { ...status };
    statusError = '';
    await tick();
    statusDialog?.showModal();
  }
  function closeStatus() {
    statusDialog?.close();
    editingStatus = null;
    lastTrigger?.focus();
  }
  async function saveStatus(remove = false) {
    if (!editingStatus) return;
    busy = true;
    statusError = '';
    try {
      const id = await ensureBoard();
      await api(
        `/platform/boards/${id}/statuses/${editingStatus.id}`,
        remove ? 'DELETE' : 'PATCH',
        remove
          ? undefined
          : {
              name: editingStatus.name.trim(),
              color: color(editingStatus),
              deleted: !!editingStatus.deleted
            }
      );
      await refresh();
      closeStatus();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error';
      statusError =
        message === 'STATUS_HAS_LIVE_ITEMS'
          ? 'Move or remove all live tasks from this status first.'
          : message === 'INVALID_BOARD_STATUSES'
            ? 'A board must have between 1 and 20 active statuses.'
            : message;
    } finally {
      busy = false;
    }
  }
  async function create() {
    await run(async () => {
      const id = await ensureBoard();
      await api(`/platform/boards/${id}/items`, 'POST', {
        title,
        markdown,
        tags: [],
        column: composer,
        position:
          Math.max(-1, ...items.filter((i) => i.column === composer).map((i) => i.position)) + 1
      });
      closeComposer();
    });
  }
  async function move(item: Item, column: string) {
    if (item.column === column || busy) return;
    await run(async () => {
      const updated = await api<Item>(`/platform/items/${item.id}`, 'PATCH', {
        version: item.version,
        column,
        position:
          Math.max(-1, ...items.filter((i) => i.column === column).map((i) => i.position)) + 1
      });
      if (selected?.id === updated.id) selected = updated;
    });
  }
  function clearHoldTimer() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  }
  function beginMobileHold(item: Item, event: PointerEvent) {
    if (event.pointerType !== 'touch') return;
    clearHoldTimer();
    touchPress = { item, x: event.clientX, y: event.clientY };
    holdTimer = setTimeout(() => {
      mobileMoveItem = item;
      mobileDropTarget = null;
      suppressTaskClick = item.id;
      if ('vibrate' in navigator) navigator.vibrate?.(20);
      holdTimer = null;
    }, 450);
  }
  function updateMobileDropTarget(event: PointerEvent) {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-mobile-status]');
    mobileDropTarget = target?.dataset.mobileStatus ?? null;
  }
  function handleMobilePointerMove(event: PointerEvent) {
    if (holdTimer && touchPress) {
      const dx = event.clientX - touchPress.x;
      const dy = event.clientY - touchPress.y;
      if (Math.hypot(dx, dy) > 18) {
        clearHoldTimer();
        touchPress = null;
      }
    }
    if (mobileMoveItem) updateMobileDropTarget(event);
  }
  function finishMobileMove(statusId: string) {
    if (!mobileMoveItem) return;
    const item = mobileMoveItem;
    mobileMoveItem = null;
    mobileDropTarget = null;
    touchPress = null;
    suppressTaskClick = null;
    clearHoldTimer();
    void move(item, statusId);
  }
  function cancelMobileMove() {
    clearHoldTimer();
    touchPress = null;
    mobileMoveItem = null;
    mobileDropTarget = null;
  }
  function handleMobilePointerUp(event: PointerEvent) {
    clearHoldTimer();
    touchPress = null;
    if (!mobileMoveItem) return;
    updateMobileDropTarget(event);
    const statusId = mobileDropTarget;
    if (statusId) finishMobileMove(statusId);
  }
  async function addStatus() {
    await run(async () => {
      const id = await ensureBoard();
      await api(`/platform/boards/${id}/statuses`, 'PUT', {
        statuses: [
          ...statuses,
          {
            id: `s-${crypto.randomUUID().slice(0, 8)}`,
            name: statusName.trim(),
            color: statusColor
          }
        ]
      });
      statusName = '';
      addingStatus = false;
    });
  }
  async function loadComments(id: string) {
    const generation = ++detailGeneration;
    commentsLoading = true;
    try {
      const result = await api<Comment[]>(`/platform/items/${id}/comments`);
      if (generation === detailGeneration) comments = result;
    } catch (error) {
      if (generation === detailGeneration)
        reportError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      if (generation === detailGeneration) commentsLoading = false;
    }
  }
  async function openItem(item: Item, event: MouseEvent) {
    lastTrigger = event.currentTarget as HTMLElement;
    selected = { ...item };
    editing = false;
    confirmingDelete = false;
    reply = '';
    comments = [];
    await tick();
    dialog?.showModal();
    void loadComments(item.id);
  }

  let openedItemId = $state<string | null>(null);

  $effect(() => {
    if (activeItemId && items.length > 0 && !selected && openedItemId !== activeItemId) {
      const target = items.find((i) => i.id === activeItemId);
      if (target) {
        openedItemId = activeItemId;
        selected = { ...target };
        editing = false;
        confirmingDelete = false;
        reply = '';
        comments = [];
        void tick().then(() => {
          dialog?.showModal();
          void loadComments(target.id);
        });
      }
    }
  });

  function closeItem() {
    detailGeneration++;
    dialog?.close();
    selected = null;
    lastTrigger?.focus();
  }
  async function saveItem() {
    if (!selected) return;
    await run(async () => {
      selected = await api<Item>(`/platform/items/${selected!.id}`, 'PATCH', {
        version: selected!.version,
        title: editTitle,
        markdown: editMarkdown
      });
      editing = false;
    });
  }
  async function removeItem() {
    if (!selected) return;
    await run(async () => {
      await api(`/platform/items/${selected!.id}`, 'DELETE', { version: selected!.version });
      closeItem();
    });
  }
  async function postReply() {
    if (!selected) return;
    await run(async () => {
      await api(`/platform/items/${selected!.id}/comments`, 'POST', { markdown: reply });
      reply = '';
      await loadComments(selected!.id);
    });
  }
  async function saveCommentEdit(id: string) {
    if (!selected) return;
    await run(async () => {
      await api(`/platform/comments/${id}`, 'PATCH', { markdown: editingCommentMarkdown });
      editingCommentId = null;
      editingCommentMarkdown = '';
      await loadComments(selected!.id);
    });
  }
  async function deleteComment(id: string) {
    if (!selected || !confirm('Delete comment?')) return;
    await run(async () => {
      await api(`/platform/comments/${id}`, 'DELETE');
      await loadComments(selected!.id);
    });
  }
</script>

<svelte:window
  onpointermove={handleMobilePointerMove}
  onpointerup={handleMobilePointerUp}
  onpointercancel={cancelMobileMove}
  onkeydown={(event) => {
    if (event.key === 'Escape' && mobileMoveItem) cancelMobileMove();
  }}
/>

<div
  class="board"
  style:grid-template-columns={`repeat(${activeStatuses.length}, minmax(260px, 1fr))`}
>
  {#each activeStatuses as status (status.id)}
    <section
      class="board-column"
      class:drop-target={over === status.id}
      aria-label={label(status)}
      ondragover={(event) => {
        if (dragged) {
          event.preventDefault();
          over = status.id;
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        }
      }}
      ondragleave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) over = null;
      }}
      ondrop={(event) => {
        event.preventDefault();
        const item = items.find((i) => i.id === dragged);
        dragged = null;
        over = null;
        if (item) void move(item, status.id);
      }}
    >
      <div class="column-header">
        <span class="column-label"
          ><span class="column-dot" style:background={color(status)}></span>{label(status)}<span
            class="column-count">{items.filter((i) => i.column === status.id).length}</span
          ></span
        >
        {#if canManage}<button
            type="button"
            class="icon-button"
            aria-label={`${'Edit status'}: ${label(status)}`}
            disabled={busy}
            onclick={(event) => openStatus(status, event)}
            ><Pencil size={15} aria-hidden="true" /></button
          >{/if}
        <button
          id={`add-${status.id}`}
          type="button"
          class="icon-button"
          aria-label={`${'Add task to'} ${label(status)}`}
          disabled={busy}
          onclick={() => openComposer(status.id)}><Plus size={17} aria-hidden="true" /></button
        >
      </div>
      <div class="column-items">
        {#each items
          .filter((i) => i.column === status.id)
          .sort((a, b) => a.position - b.position) as item (item.id)}
          <button
            type="button"
            class="kanban-card task-card"
            class:dragging={dragged === item.id}
            draggable={!busy}
            disabled={busy}
            onpointerdown={(event) => beginMobileHold(item, event)}
            ondragstart={(event) => {
              if (touchPress?.item.id === item.id || mobileMoveItem?.id === item.id) {
                event.preventDefault();
                return;
              }
              dragged = item.id;
              if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', item.id);
                event.dataTransfer.effectAllowed = 'move';
              }
            }}
            ondragend={() => {
              dragged = null;
              over = null;
            }}
            onclick={(event) => {
              if (suppressTaskClick === item.id) {
                suppressTaskClick = null;
                event.preventDefault();
                return;
              }
              openItem(item, event);
            }}
          >
            <span class="task-title"
              ><strong>{item.title}</strong><GripVertical size={14} aria-hidden="true" /></span
            >
            {#if item.markdown}<div class="kanban-markdown-preview">
                <MarkdownContent value={item.markdown} {language} />
              </div>{/if}
            {#if item.tags.length}<span class="task-tags"
                >{#each item.tags as tag}<span class="tag">{tag}</span>{/each}</span
              >{/if}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="column-add"
        disabled={busy}
        onclick={() => openComposer(status.id)}
        ><Plus size={16} aria-hidden="true" />{'Add task'}</button
      >
    </section>
  {/each}
</div>
{#if mobileMoveItem}
  <div class="mobile-move-tray" role="group" aria-label={'Move task to a status'}>
    <div class="mobile-move-heading">
      <span>{'Move task to'} <strong>{mobileMoveItem.title}</strong></span>
      <button type="button" class="icon-button" aria-label={'Close'} onclick={cancelMobileMove}
        ><X size={18} aria-hidden="true" /></button
      >
    </div>
    <div class="mobile-move-options">
      {#each activeStatuses as status (status.id)}
        <button
          type="button"
          data-mobile-status={status.id}
          class="mobile-move-option"
          class:drop-target={mobileDropTarget === status.id}
          style:border-color={color(status)}
          disabled={busy}
          onclick={() => finishMobileMove(status.id)}
        >
          <span class="column-dot" style:background={color(status)}></span>{label(status)}
        </button>
      {/each}
    </div>
  </div>
{/if}
{#if composer}<dialog
    bind:this={composerDialog}
    class="issue-dialog"
    aria-labelledby="new-task-heading"
    oncancel={(event) => {
      event.preventDefault();
      closeComposer();
    }}
  >
    <div class="issue-heading">
      <h2 id="new-task-heading">{'New task'}</h2>
    </div>
    <form
      class="issue-editor"
      onsubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <label for="task-title">{'Task title'}</label><input
        id="task-title"
        bind:value={title}
        required
        maxlength="200"
        placeholder={'What needs to be done?'}
      />
      <Dropdown label={'Task status'} bind:value={composer} {options} />
      <Editor {language} bind:value={markdown} rows={10} />
      <div class="row">
        <button class="btn" disabled={busy || !title.trim()}>{'Add task'}</button><button
          type="button"
          class="btn btn-outline"
          disabled={busy}
          onclick={closeComposer}>{'Cancel'}</button
        >
      </div>
    </form>
  </dialog>{/if}
{#if canManage && activeStatuses.length < 20 && statuses.length < 100}<div class="status-create">
    {#if addingStatus}<form
        class="row"
        onsubmit={(event) => {
          event.preventDefault();
          void addStatus();
        }}
      >
        <label for="status-name" class="sr-only">{'Status name'}</label><input
          id="status-name"
          bind:value={statusName}
          placeholder={'Status name'}
          maxlength="60"
          required
        /><input type="color" aria-label={'Status color'} bind:value={statusColor} /><button
          class="btn btn-outline"
          disabled={busy || !statusName.trim()}>{'Add status'}</button
        ><button
          type="button"
          class="icon-button"
          aria-label={'Cancel'}
          onclick={() => (addingStatus = false)}><X size={16} aria-hidden="true" /></button
        >
      </form>
    {:else}<button
        type="button"
        class="btn btn-outline"
        disabled={busy}
        onclick={async () => {
          addingStatus = true;
          await tick();
          document.getElementById('status-name')?.focus();
        }}><Plus size={15} aria-hidden="true" />{'Add status'}</button
      >{/if}
  </div>{/if}
{#if canManage && statuses.some((s) => s.deleted)}<details class="deleted-statuses">
    <summary>{'Deleted statuses'}</summary
    >{#each statuses.filter((s) => s.deleted) as status}<button
        class="btn btn-outline"
        onclick={(event) => openStatus(status, event)}
        ><Pencil size={14} aria-hidden="true" />{label(status)}</button
      >{/each}
  </details>{/if}
{#if editingStatus}<dialog
    class="issue-dialog status-dialog"
    bind:this={statusDialog}
    aria-labelledby="status-heading"
    oncancel={(event) => {
      event.preventDefault();
      closeStatus();
    }}
  >
    <div class="issue-heading">
      <h2 id="status-heading">{'Edit status'}</h2>
      <button class="icon-button" aria-label={'Close'} onclick={closeStatus}
        ><X size={18} aria-hidden="true" /></button
      >
    </div>
    <form
      class="issue-editor"
      onsubmit={(event) => {
        event.preventDefault();
        void saveStatus();
      }}
    >
      <label for="edit-status-name">{'Name'}</label><input
        id="edit-status-name"
        bind:value={editingStatus.name}
        required
        maxlength="60"
      />
      <label for="edit-status-color">{'Color'}</label><input
        id="edit-status-color"
        type="color"
        value={color(editingStatus)}
        oninput={(event) => (editingStatus!.color = event.currentTarget.value)}
      />
      <label class="status-state"
        ><input type="checkbox" bind:checked={editingStatus.deleted} />{'Deleted'}</label
      >
      {#if statusError}<p role="alert" class="error">{statusError}</p>{/if}
      <div class="row">
        <button class="btn" disabled={busy || !editingStatus.name.trim()}
          ><Save size={14} aria-hidden="true" />{'Save'}</button
        ><button type="button" class="btn btn-outline" disabled={busy} onclick={closeStatus}
          >{'Cancel'}</button
        >{#if !editingStatus.deleted}<button
            type="button"
            class="btn btn-outline danger-button"
            disabled={busy}
            onclick={() => saveStatus(true)}
            ><Trash2 size={14} aria-hidden="true" />{'Delete status'}</button
          >{/if}
      </div>
    </form>
  </dialog>{/if}
{#if selected}<dialog
    bind:this={dialog}
    class="issue-dialog"
    aria-labelledby="issue-title"
    oncancel={(event) => {
      event.preventDefault();
      closeItem();
    }}
  >
    <div class="issue-heading">
      <div>
        <span class="tag">{options.find((s) => s.value === selected?.column)?.label}</span>
        <h2 id="issue-title">{selected.title}</h2>
      </div>
      <button type="button" class="icon-button" aria-label={'Close task'} onclick={closeItem}
        ><X size={20} aria-hidden="true" /></button
      >
    </div>
    <div class="issue-tools">
      <Dropdown
        label={'Task status'}
        value={selected.column}
        {options}
        disabled={busy}
        onselect={(column) => void move(selected!, column)}
      /><button
        type="button"
        class="btn btn-outline"
        disabled={busy}
        onclick={() => {
          editing = !editing;
          editTitle = selected!.title;
          editMarkdown = selected!.markdown;
        }}><Pencil size={14} aria-hidden="true" />{'Edit'}</button
      ><button
        type="button"
        class="btn btn-outline danger-button"
        disabled={busy}
        onclick={() => (confirmingDelete = true)}
        ><Trash2 size={14} aria-hidden="true" />{'Remove'}</button
      >
    </div>
    {#if confirmingDelete}<section
        class="delete-confirmation"
        role="alert"
        aria-label={'Confirm deletion'}
      >
        <h3>{'Remove this task?'}</h3>
        <p>
          {'The task will move to the graveyard. A leader can restore it.'}
        </p>
        <div class="row">
          <button class="btn danger-button" disabled={busy} onclick={removeItem}
            >{'Confirm removal'}</button
          ><button class="btn btn-outline" onclick={() => (confirmingDelete = false)}
            >{'Cancel'}</button
          >
        </div>
      </section>{/if}
    {#if editing}<form
        class="issue-editor"
        onsubmit={(event) => {
          event.preventDefault();
          void saveItem();
        }}
      >
        <label for="issue-edit-title">{'Title'}</label><input
          id="issue-edit-title"
          bind:value={editTitle}
          required
          maxlength="200"
        /><Editor {language} bind:value={editMarkdown} />
        <div class="row">
          <button class="btn" disabled={busy || !editTitle.trim()}
            ><Save size={14} aria-hidden="true" />{'Save'}</button
          ><button type="button" class="btn btn-outline" onclick={() => (editing = false)}
            >{'Cancel'}</button
          >
        </div>
      </form>
    {:else}<div class="issue-description">
        <MarkdownContent value={selected.markdown} {language} />
      </div>{/if}
    <section class="issue-discussion" aria-labelledby="discussion-title">
      <h3 id="discussion-title">
        <MessagesSquare size={18} aria-hidden="true" />{'Discussion'}<span class="muted"
          >{comments.length}</span
        >
      </h3>
      {#if commentsLoading}<div
          class="discussion-skeleton"
          aria-label={'Loading discussion'}
        ></div>{:else}
        {#each comments as comment (comment.id)}<article class="discussion-post">
            <div class="post-meta">
              <strong>{comment.authorName || 'Association member'}</strong><time
                datetime={comment.createdAt}
                >{new Date(comment.createdAt).toLocaleString(
                  language === 'pl' ? 'pl-PL' : 'en-GB'
                )}</time
              >
              {#if comment.authorId === userId || canManage}
                <div class="comment-actions">
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
                    onclick={() => deleteComment(comment.id)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              {/if}
            </div>
            {#if editingCommentId === comment.id}
              <form
                class="issue-reply"
                onsubmit={(event) => {
                  event.preventDefault();
                  void saveCommentEdit(comment.id);
                }}
              >
                <Editor {language} bind:value={editingCommentMarkdown} rows={4} />
                <div style="display: flex; gap: 8px;">
                  <button class="btn" disabled={busy || !editingCommentMarkdown.trim()}
                    >{'Save'}</button
                  >
                  <button
                    type="button"
                    class="btn ghost"
                    onclick={() => {
                      editingCommentId = null;
                    }}>{'Cancel'}</button
                  >
                </div>
              </form>
            {:else}
              <MarkdownContent value={comment.markdown} {language} />
            {/if}
          </article>{/each}
        {#if !comments.length}<p class="muted">
            {'Start a discussion about this task.'}
          </p>{/if}{/if}
      <form
        class="issue-reply"
        onsubmit={(event) => {
          event.preventDefault();
          void postReply();
        }}
      >
        <Editor {language} bind:value={reply} rows={4} /><button
          class="btn"
          disabled={busy || !reply.trim()}>{'Reply'}</button
        >
      </form>
    </section>
  </dialog>{/if}

<style>
  .status-dialog {
    width: min(560px, calc(100vw - 32px));
  }
  .status-state {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .deleted-statuses {
    margin-top: 20px;
  }
  .deleted-statuses summary {
    cursor: pointer;
    margin-bottom: 12px;
  }
  .deleted-statuses .btn {
    margin: 4px;
  }
  .column-label {
    margin-right: auto;
  }
  .column-header {
    gap: 8px;
  }
  .delete-confirmation {
    border: 1px solid var(--danger);
    padding: 16px;
    margin-bottom: 20px;
    display: grid;
    gap: 12px;
  }
  .issue-tools :global(.dropdown-trigger) {
    min-height: 36px;
    height: 36px;
    line-height: 1.2;
    padding: 8px 12px;
  }
  .issue-tools > .btn {
    height: 36px;
    line-height: 1.2;
  }
  .board {
    overflow-x: auto;
    padding: 3px 3px 12px;
  }
  .task-card {
    width: 100%;
    text-align: left;
    color: var(--ink);
    border: 1px solid var(--line);
    cursor: grab;
    display: grid;
    gap: 9px;
    margin-bottom: 10px;
  }
  .task-card:active {
    cursor: grabbing;
  }
  .task-card.dragging {
    opacity: 0.45;
  }
  .task-title {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
  }
  .task-title :global(svg) {
    color: var(--muted);
    opacity: 0;
    flex-shrink: 0;
  }
  .task-card:hover .task-title :global(svg) {
    opacity: 1;
  }
  .kanban-markdown-preview {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    max-height: 100px;
    overflow: hidden;
    mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
  }
  .kanban-markdown-preview :global(h1),
  .kanban-markdown-preview :global(h2),
  .kanban-markdown-preview :global(h3),
  .kanban-markdown-preview :global(h4),
  .kanban-markdown-preview :global(h5),
  .kanban-markdown-preview :global(h6) {
    font-size: 13px !important;
    font-weight: 600 !important;
    margin: 4px 0 !important;
    line-height: 1.4 !important;
  }
  .kanban-markdown-preview :global(p) {
    margin: 2px 0 !important;
  }
  .kanban-markdown-preview :global(img) {
    max-height: 60px;
    width: auto;
    border-radius: 4px;
    margin: 4px 0;
  }
  .task-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }
  .drop-target {
    border-color: var(--accent) !important;
    outline: 1px solid var(--accent);
    outline-offset: -3px;
    background: var(--surface-muted) !important;
  }
  .status-create {
    margin-top: 20px;
  }
  .status-create input[type='color'] {
    width: 42px;
    height: 36px;
    padding: 3px;
  }

  .status-create input {
    max-width: 260px;
    margin: 0;
  }
  .issue-dialog {
    position: fixed;
    inset: 0;
    width: min(760px, calc(100vw - 32px));
    max-height: calc(100dvh - 48px);
    margin: auto;
    border: 1px solid var(--control-border-hover);
    border-radius: 5px;
    background: var(--surface);
    color: var(--ink);
    padding: 28px;
    overflow: auto;
  }
  .issue-dialog::backdrop {
    background: #0009;
    backdrop-filter: blur(3px);
  }
  .issue-heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 16px;
    margin-bottom: 20px;
  }
  .issue-heading h2 {
    font-size: 24px;
    margin-top: 10px;
    overflow-wrap: anywhere;
  }
  .issue-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .issue-tools :global(.dropdown) {
    flex: 1;
    min-width: 160px;
  }
  .issue-description {
    padding-bottom: 24px;
  }
  .issue-editor {
    display: grid;
    gap: 10px;
    margin-bottom: 24px;
  }
  .issue-discussion {
    border-top: 1px solid var(--line);
    padding-top: 24px;
  }
  .issue-discussion h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    margin-bottom: 20px;
  }
  .discussion-post {
    border-bottom: 1px solid var(--line);
    padding: 16px 0;
  }
  .post-meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--muted);
  }
  .post-meta time {
    font-size: 11px;
  }
  .issue-reply {
    display: grid;
    gap: 16px;
    margin-top: 24px;
  }
  .issue-reply > .btn {
    justify-self: start;
  }
  .discussion-skeleton {
    height: 80px;
    background: var(--surface-muted);
    border-radius: 3px;
  }
  @media (max-width: 760px) {
    .mobile-move-tray {
      position: fixed;
      z-index: 1000;
      inset-inline: 12px;
      bottom: calc(12px + env(safe-area-inset-bottom));
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .mobile-move-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      font-size: 13px;
    }
    .mobile-move-heading > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mobile-move-options {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 2px 6px;
      overscroll-behavior-inline: contain;
      -webkit-overflow-scrolling: touch;
    }
    .mobile-move-option {
      display: inline-flex;
      flex: 0 0 auto;
      min-height: 44px;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--surface);
      color: var(--ink);
      font: inherit;
      white-space: nowrap;
      touch-action: manipulation;
    }
    .board {
      grid-template-columns: none !important;
      grid-auto-flow: column;
      grid-auto-columns: minmax(250px, 1fr);
      overflow-x: auto;
      touch-action: pan-x pan-y;
    }
    .issue-dialog {
      padding: 20px 16px;
      max-height: calc(100dvh - 24px);
    }
    .issue-heading h2 {
      font-size: 20px;
    }
    .post-meta {
      flex-wrap: wrap;
    }
  }
  .comment-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  .icon-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: var(--muted);
    cursor: pointer;
  }
  .icon-action-btn:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .icon-action-btn.danger:hover {
    color: var(--red);
  }
</style>
