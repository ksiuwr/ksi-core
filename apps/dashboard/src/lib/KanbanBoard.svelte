<script lang="ts">
  import { tick } from 'svelte';
  import {
    Plus,
    X,
    Trash2,
    Pencil,
    Save,
    MessagesSquare,
    GripVertical,
    Check,
    Settings2
  } from '@lucide/svelte';
  import Dropdown, { type DropdownOption } from '@ksi-core/ui/platform/Dropdown.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  export type BoardStatus = { id: string; name: string; color?: string; deleted?: boolean };
  export type BoardLabel = { name: string; color?: string; description?: string };
  export type Item = {
    id: string;
    title: string;
    markdown: string;
    column: string;
    version: number;
    position: number;
    labels: string[];
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
    boardLabels = [],
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
    boardLabels?: (string | BoardLabel)[];
    boardId: string;
    projectId: string;
    language: 'pl' | 'en';
    canManage?: boolean;
    userId?: string;
    activeItemId?: string | null;
    refresh: () => Promise<void>;
    reportError: (error: string) => void;
  } = $props();

  const PRESET_LABEL_COLORS = [
    '#6b7280', // Default Gray
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#374151' // Slate
  ];

  const normalizedLabels = $derived<BoardLabel[]>(
    boardLabels.map((t) =>
      typeof t === 'string'
        ? { name: t, color: '#6b7280' }
        : { name: t.name, color: t.color || '#6b7280', description: t.description }
    )
  );
  const labelMap = $derived<Map<string, BoardLabel>>(
    new Map(normalizedLabels.map((label) => [label.name, label]))
  );

  let selectedLabel = $state<string>('');
  let taskLabels = $state<string[]>([]);
  let editLabels = $state<string[]>([]);

  let labelDialog = $state<HTMLDialogElement>();
  let labelDraftName = $state('');
  let labelDraftColor = $state('#6b7280');
  let labelDraftDescription = $state('');
  let labelFormError = $state('');
  let editingLabelName = $state<string | null>(null);
  let managingLabels = $state(false);
  let manageLabelError = $state('');

  $effect(() => {
    void boardId;
    selectedLabel = '';
    managingLabels = false;
    editingLabelName = null;
    manageLabelError = '';
  });

  const visibleItems = $derived(
    selectedLabel ? items.filter((item) => item.labels.includes(selectedLabel)) : items
  );

  const labelFilterOptions = $derived<DropdownOption[]>([
    {
      value: '',
      label: 'All labels'
    },
    ...normalizedLabels.map((label) => ({
      value: label.name,
      label: label.name,
      color: label.color || '#6b7280',
      description: label.description
    }))
  ]);

  function openLabelDialog(existing?: BoardLabel) {
    editingLabelName = existing?.name ?? null;
    labelDraftName = existing?.name ?? '';
    labelDraftColor = existing?.color || '#6b7280';
    labelDraftDescription = existing?.description ?? '';
    labelFormError = '';
    labelDialog?.showModal();
    document.getElementById('label-name')?.focus();
  }

  function closeLabelDialog() {
    labelDialog?.close();
    editingLabelName = null;
    labelFormError = '';
  }

  async function submitLabel() {
    const trimmed = labelDraftName.trim();
    if (!trimmed) return;
    const originalName = editingLabelName;
    labelFormError = '';
    await run(async () => {
      const id = await ensureBoard();
      try {
        const path = `/platform/boards/${id}/labels`;
        await api(
          originalName === null ? path : `${path}/${encodeURIComponent(originalName)}`,
          originalName === null ? 'POST' : 'PATCH',
          {
            name: trimmed,
            color: labelDraftColor,
            description: labelDraftDescription.trim() || undefined
          }
        );
        if (originalName !== null && selectedLabel === originalName) selectedLabel = trimmed;
        closeLabelDialog();
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        labelFormError =
          code === 'LABEL_ALREADY_EXISTS'
            ? 'A label with this name already exists.'
            : code === 'INVALID_BOARD_LABELS'
              ? 'Invalid label or name already in use.'
              : code;
        throw new Error(labelFormError);
      }
    });
  }

  async function deleteLabel(name: string) {
    manageLabelError = '';
    await run(async () => {
      const id = await ensureBoard();
      try {
        await api(`/platform/boards/${id}/labels/${encodeURIComponent(name)}`, 'DELETE');
        if (selectedLabel === name) selectedLabel = '';
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg === 'LABEL_IN_USE') {
          manageLabelError =
            'Cannot delete label because it is assigned to tasks on the board. Remove it from tasks first.';
          throw new Error(manageLabelError);
        }
        throw err;
      }
    });
  }
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
    if (busy) return;
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
    taskLabels = [];
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
    if (busy || !title.trim()) return;
    await run(async () => {
      const id = await ensureBoard();
      await api(`/platform/boards/${id}/items`, 'POST', {
        title,
        markdown,
        labels: taskLabels,
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
        markdown: editMarkdown,
        labels: editLabels
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
    if (!selected || busy || !reply.trim()) return;
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

<div class="board-toolbar">
  <div class="board-filters">
    <div class="label-filter-container">
      <Dropdown
        label={'Filter by label'}
        placeholder={'Filter by label'}
        bind:value={selectedLabel}
        options={labelFilterOptions}
        searchable={true}
        searchPlaceholder={'Search labels…'}
        panelContent={canManage && managingLabels ? labelManagement : undefined}
        footer={canManage ? labelActions : undefined}
      />
      {#if selectedLabel}
        <button
          type="button"
          class="btn-clear-filter"
          onclick={() => (selectedLabel = '')}
          title={'Clear label filter'}
          aria-label={'Clear filter'}
        >
          <X size={14} aria-hidden="true" />
        </button>
      {/if}
    </div>
  </div>
</div>

{#snippet labelActions(close: () => void)}
  <div class="label-dropdown-actions">
    <button
      type="button"
      class="label-dropdown-action"
      disabled={busy}
      onclick={() => (managingLabels = !managingLabels)}
    >
      <Settings2 size={15} aria-hidden="true" />
      {managingLabels ? 'Filter by label' : 'Manage labels'}
    </button>
    <button
      type="button"
      class="label-dropdown-action"
      disabled={busy}
      onclick={() => {
        close();
        openLabelDialog();
      }}
    >
      <Plus size={15} aria-hidden="true" />
      {'New label'}
    </button>
  </div>
{/snippet}

{#snippet labelManagement(close: () => void)}
  <section class="manage-labels-panel" aria-label={'Manage labels'}>
    <div class="manage-labels-header">
      <h4>{'Board labels'}</h4>
      <button
        type="button"
        class="icon-button"
        onclick={() => (managingLabels = false)}
        aria-label={'Close'}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
    {#if manageLabelError}
      <p class="manage-label-error" role="alert">{manageLabelError}</p>
    {/if}
    <p class="manage-labels-hint">
      {'Remove a label from tasks before deleting it from the board.'}
    </p>

    {#if normalizedLabels.length === 0}
      <p class="muted">
        {'No labels on this board yet.'}
      </p>
    {:else}
      <div class="manage-labels-list">
        {#each normalizedLabels as label}
          <div class="manage-label-item">
            <div class="manage-label-info">
              <span class="label-badge" style:--label-color={label.color || '#6b7280'}>
                <span class="label-dot"></span>
                <span class="label-name">{label.name}</span>
              </span>
              {#if label.description}
                <span class="manage-label-desc">{label.description}</span>
              {/if}
            </div>
            <div class="manage-label-actions">
              <button
                type="button"
                class="icon-button"
                disabled={busy}
                onclick={() => {
                  close();
                  openLabelDialog(label);
                }}
                aria-label={'Edit label'}
              >
                <Pencil size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                class="icon-button danger-button"
                disabled={busy}
                onclick={() => void deleteLabel(label.name)}
                aria-label={'Delete label'}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/snippet}
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
            class="column-count">{visibleItems.filter((i) => i.column === status.id).length}</span
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
        {#each visibleItems
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
            {#if item.labels.length}<div class="task-labels">
                {#each item.labels as labelName}
                  {@const label = labelMap.get(labelName)}
                  <span
                    class="label-badge"
                    style:--label-color={label?.color || '#6b7280'}
                    title={label?.description || labelName}
                  >
                    <span class="label-dot"></span>
                    <span class="label-name">{labelName}</span>
                  </span>
                {/each}
              </div>{/if}
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
        onkeydown={(event) => {
          if (
            !event.defaultPrevented &&
            !event.isComposing &&
            (event.ctrlKey || event.metaKey) &&
            // @wc-ignore
            event.key === 'Enter'
          ) {
            event.preventDefault();
            if (!busy) event.currentTarget.form?.requestSubmit();
          }
        }}
        id="task-title"
        bind:value={title}
        required
        maxlength="200"
        placeholder={'What needs to be done?'}
      />
      <Dropdown label={'Task status'} bind:value={composer} {options} />
      {#if normalizedLabels.length}
        <div class="task-label-picker">
          <span class="label-picker-label">{'Labels'}</span>
          <div class="label-chips">
            {#each normalizedLabels as label}
              {@const isSelected = taskLabels.includes(label.name)}
              <button
                type="button"
                class="label-chip"
                class:selected={isSelected}
                aria-pressed={isSelected}
                style:--label-color={label.color || '#6b7280'}
                onclick={() => {
                  taskLabels = isSelected
                    ? taskLabels.filter((t) => t !== label.name)
                    : [...taskLabels, label.name];
                }}
                title={label.description || label.name}
              >
                <span class="label-dot"></span>
                <span>{label.name}</span>
                {#if isSelected}
                  <Check size={12} aria-hidden="true" />
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
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
{#if canManage}
  <dialog
    bind:this={labelDialog}
    class="issue-dialog label-dialog"
    aria-labelledby="label-heading"
    oncancel={(event) => {
      event.preventDefault();
      closeLabelDialog();
    }}
  >
    <div class="issue-heading">
      <h2 id="label-heading">{editingLabelName === null ? 'Create new label' : 'Edit label'}</h2>
      <button type="button" class="icon-button" aria-label={'Close'} onclick={closeLabelDialog}>
        <X size={20} aria-hidden="true" />
      </button>
    </div>

    <div class="label-preview-card">
      <span class="preview-title">{'Preview'}:</span>
      <span class="label-badge" style:--label-color={labelDraftColor || '#6b7280'}>
        <span class="label-dot"></span>
        <span class="label-name">{labelDraftName.trim() || 'Label name'}</span>
      </span>
      {#if labelDraftDescription.trim()}
        <span class="preview-desc muted">{labelDraftDescription.trim()}</span>
      {/if}
    </div>

    {#if labelFormError}
      <p class="manage-label-error" role="alert">{labelFormError}</p>
    {/if}

    <form
      class="issue-editor"
      onsubmit={(event) => {
        event.preventDefault();
        void submitLabel();
      }}
    >
      <label for="label-name">{'Label name'}</label>
      <input
        id="label-name"
        bind:value={labelDraftName}
        maxlength="50"
        required
        placeholder={'e.g. bug, docs'}
      />

      <label for="label-desc">{'Description (optional)'}</label>
      <input
        id="label-desc"
        bind:value={labelDraftDescription}
        maxlength="200"
        placeholder={'Brief description'}
      />

      <label for="label-color">{'Color'}</label>
      <div class="color-picker-row">
        <input id="label-color" type="color" bind:value={labelDraftColor} />
        <div class="preset-swatches">
          {#each PRESET_LABEL_COLORS as preset}
            <button
              type="button"
              class="color-swatch"
              class:active={labelDraftColor.toLowerCase() === preset.toLowerCase()}
              style:background-color={preset}
              title={preset}
              aria-label={preset}
              aria-pressed={labelDraftColor.toLowerCase() === preset.toLowerCase()}
              onclick={() => (labelDraftColor = preset)}
            ></button>
          {/each}
        </div>
      </div>

      <div class="row">
        <button class="btn" disabled={busy || !labelDraftName.trim()}>
          {editingLabelName === null ? 'Create label' : 'Save'}
        </button>
        <button type="button" class="btn btn-outline" disabled={busy} onclick={closeLabelDialog}>
          {'Cancel'}
        </button>
      </div>
    </form>
  </dialog>
{/if}
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
        <div class="issue-heading-meta">
          <span class="tag">{options.find((s) => s.value === selected?.column)?.label}</span>
          {#if selected.labels.length}
            <div class="task-detail-labels">
              {#each selected.labels as labelName}
                {@const label = labelMap.get(labelName)}
                <span
                  class="label-badge"
                  style:--label-color={label?.color || '#6b7280'}
                  title={label?.description || labelName}
                >
                  <span class="label-dot"></span>
                  <span class="label-name">{labelName}</span>
                </span>
              {/each}
            </div>
          {/if}
        </div>
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
          editLabels = [...selected!.labels];
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
        {#if normalizedLabels.length}
          <div class="task-label-picker">
            <span class="label-picker-label">{'Labels'}</span>
            <div class="label-chips">
              {#each normalizedLabels as label}
                {@const isSelected = editLabels.includes(label.name)}
                <button
                  type="button"
                  class="label-chip"
                  class:selected={isSelected}
                  aria-pressed={isSelected}
                  style:--label-color={label.color || '#6b7280'}
                  onclick={() => {
                    editLabels = isSelected
                      ? editLabels.filter((t) => t !== label.name)
                      : [...editLabels, label.name];
                  }}
                  title={label.description || label.name}
                >
                  <span class="label-dot"></span>
                  <span>{label.name}</span>
                  {#if isSelected}
                    <Check size={12} aria-hidden="true" />
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
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
  .board-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .board-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .label-filter-container {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 220px;
  }
  .label-filter-container :global(.dropdown) {
    min-width: 200px;
    margin: 0;
  }
  .btn-clear-filter {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn-clear-filter:hover {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .label-dropdown-actions {
    display: grid;
    gap: 2px;
  }
  .label-dropdown-action {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 36px;
    padding: 8px 10px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: var(--ink);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .label-dropdown-action:hover {
    background: var(--surface-muted);
  }
  .label-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
    padding: 2px 7px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--label-color, #6b7280) 14%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--label-color, #6b7280) 45%, transparent);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-badge,
  .label-chip {
    /* Keep neutral colors grey while lifting dark colors and enriching colored labels. */
    color: hsl(
      from var(--label-color, #6b7280) h min(100, calc(s * 1.25)) clamp(30, calc(l + 18), 65)
    );
  }
  .label-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--label-color, #6b7280);
    flex-shrink: 0;
  }
  .label-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .task-detail-labels {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-left: 8px;
  }
  .issue-heading-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .task-label-picker {
    display: grid;
    gap: 6px;
    margin: 8px 0;
  }
  .label-picker-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
  }
  .label-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .label-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 14px;
    background: var(--surface);
    border: 1px solid var(--control-border, var(--line));
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .label-chip:hover {
    border-color: var(--label-color, #6b7280);
    background: color-mix(in srgb, var(--label-color, #6b7280) 10%, var(--surface));
  }
  .label-chip.selected {
    background: color-mix(in srgb, var(--label-color, #6b7280) 22%, var(--surface));
    border-color: var(--label-color, #6b7280);
    font-weight: 600;
  }
  .label-dialog {
    width: min(540px, calc(100vw - 32px));
  }
  .label-preview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 6px;
    background: var(--surface-muted);
    border: 1px solid var(--line);
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .preview-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  .preview-desc {
    font-size: 12px;
  }
  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .color-picker-row input[type='color'] {
    box-sizing: border-box;
    flex: 0 0 42px;
    width: 42px;
    height: 36px;
    min-height: 36px;
    margin: 0;
    padding: 2px;
    border-radius: 3px;
    cursor: pointer;
  }
  .label-dialog .row .btn {
    height: 36px;
    min-height: 36px;
    padding: 8px 12px;
    line-height: 1.2;
  }
  .preset-swatches {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .color-swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s ease;
  }
  .color-swatch:hover {
    transform: scale(1.18);
  }
  .color-swatch.active {
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--surface);
  }
  .manage-labels-panel {
    padding: 10px;
    margin: 0;
    display: grid;
    gap: 12px;
  }
  .manage-labels-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .manage-labels-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }
  .manage-labels-hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }
  .manage-label-error {
    color: var(--danger, var(--red));
    font-size: 13px;
    margin: 0;
    padding: 8px 12px;
    border: 1px solid var(--danger, var(--red));
    border-radius: 4px;
    background: color-mix(in srgb, var(--danger, var(--red)) 10%, transparent);
  }
  .manage-labels-list {
    display: grid;
    gap: 8px;
  }
  .manage-label-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 3px;
  }
  .manage-label-info {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .manage-label-desc {
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .manage-label-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
  }
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
  .task-labels {
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
      gap: 8px;
      max-height: min(35dvh, 240px);
      overflow-y: auto;
      padding: 2px 2px 6px;
      overscroll-behavior: contain;
    }
    .mobile-move-option {
      display: flex;
      width: 100%;
      min-height: 44px;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--surface);
      color: var(--ink);
      font: inherit;
      text-align: left;
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
