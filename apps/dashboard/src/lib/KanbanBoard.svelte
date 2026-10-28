<script lang="ts">
  import { tick } from 'svelte';
  import Assignees, { type AssignmentMember } from './Assignees.svelte';
  import { statusColor as colorForStatus } from './status-color';
  import { flip } from 'svelte/animate';
  import { prefersReducedMotion } from 'svelte/motion';
  import {
    Plus,
    X,
    Trash2,
    Pencil,
    Save,
    GripVertical,
    Settings2,
    CalendarClock,
    Users
  } from '@lucide/svelte';
  import Dropdown, { type DropdownOption } from '@ksi-core/ui/platform/Dropdown.svelte';
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
    assigneeIds?: string[];
    dueAt?: string | null;
    referenceNumber?: number | null;
    deletedAt?: string;
    authorId?: string;
    createdAt?: string;
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
    taskHref,
    newTaskHref,
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
    taskHref: (id: string) => string;
    newTaskHref: (status: string) => string;
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
    finishDrag();
  });

  let optimisticOrder = $state<{ column: string; ids: string[] } | null>(null);
  const displayedItems = $derived(
    items.map((item) => {
      const position = optimisticOrder?.ids.indexOf(item.id) ?? -1;
      return position < 0 ? item : { ...item, column: optimisticOrder!.column, position };
    })
  );
  const visibleItems = $derived(
    selectedLabel
      ? displayedItems.filter((item) => item.labels.includes(selectedLabel))
      : displayedItems
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
  let members = $state<AssignmentMember[]>([]);
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-GB');
  $effect(() => {
    const controller = new AbortController();
    const path = projectId ? `/projects/${encodeURIComponent(projectId)}/members` : '/members';
    fetch(`/api/platform${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load members');
        const result = await response.json();
        if (!controller.signal.aborted) members = result;
      })
      .catch(() => {});
    return () => controller.abort();
  });
  const label = (s: BoardStatus) =>
    s.id === 'todo' && s.name === 'To do'
      ? 'To do'
      : s.id === 'progress' && s.name === 'In progress'
        ? 'In progress'
        : s.id === 'done' && s.name === 'Done'
          ? 'Done'
          : s.name;
  const color = (s: BoardStatus) => colorForStatus(s);
  const activeStatuses = $derived(statuses.filter((s) => !s.deleted));
  let editingStatus = $state<BoardStatus | null>(null),
    statusDialog = $state<HTMLDialogElement>(),
    statusError = $state('');
  let busy = $state(false),
    dragged = $state<string | null>(null),
    over = $state<string | null>(null);
  let boardElement = $state<HTMLDivElement>();
  let dragLayout: Record<string, { top: number; height: number; span: number }> = {};
  let dragStartFrame: number | undefined;
  let dragDestination = $state<{ column: string; index: number } | null>(null);
  const dragPreview = $derived.by(() => {
    const offsets = new Map<string, number>();
    const source = visibleItems.find((item) => item.id === dragged);
    const size = source ? dragLayout[source.id] : undefined;
    if (!source || !size || !dragDestination) return { offsets, slot: null };
    const ordered = (column: string) =>
      visibleItems
        .filter((item) => item.column === column)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const origin = ordered(source.column);
    const originIndex = origin.findIndex((item) => item.id === source.id);
    const destination = ordered(dragDestination.column).filter((item) => item.id !== source.id);
    const index = dragDestination.index;
    for (let i = originIndex + 1; i < origin.length; i++) offsets.set(origin[i].id, -size.span);
    if (source.column === dragDestination.column) {
      for (const item of origin) offsets.delete(item.id);
      origin.forEach((item, i) => {
        if (i > originIndex && i <= index) offsets.set(item.id, -size.span);
        if (i >= index && i < originIndex) offsets.set(item.id, size.span);
      });
    }
    if (source.column !== dragDestination.column) {
      for (const item of destination.slice(index)) offsets.set(item.id, size.span);
    }
    const top = destination
      .slice(0, index)
      .reduce((sum, item) => sum + (dragLayout[item.id]?.span ?? 0), 0);
    return {
      offsets,
      slot: {
        column: dragDestination.column,
        top,
        height: size.height,
        extraSpace: source.column === dragDestination.column ? 0 : size.span
      }
    };
  });

  function finishDrag() {
    if (dragStartFrame !== undefined) cancelAnimationFrame(dragStartFrame);
    dragStartFrame = undefined;
    dragged = null;
    over = null;
    dragDestination = null;
  }
  function startDrag(item: Item, event: DragEvent) {
    dragLayout = {};
    boardElement?.querySelectorAll<HTMLElement>('[data-item-id]').forEach((element) => {
      dragLayout[element.dataset.itemId!] = {
        top: element.offsetTop,
        height: element.offsetHeight,
        span: element.offsetHeight + parseFloat(getComputedStyle(element).marginBottom)
      };
    });
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', item.id);
      event.dataTransfer.effectAllowed = 'move';
    }
    // Let the browser capture the native drag image before styling its source.
    dragStartFrame = requestAnimationFrame(() => {
      dragStartFrame = undefined;
      dragged = item.id;
      over = item.column;
      dragDestination = {
        column: item.column,
        index: visibleItems
          .filter((candidate) => candidate.column === item.column)
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
          .findIndex((candidate) => candidate.id === item.id)
      };
    });
  }

  function previewDrag(column: string, event: DragEvent) {
    const source = items.find((item) => item.id === dragged);
    if (!source) return;
    event.preventDefault();
    over = column;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const container = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
      '.column-items'
    );
    if (!container) return;
    const y = event.clientY - container.getBoundingClientRect().top;
    const candidates = visibleItems.filter((item) => item.column === column && item.id !== dragged);
    const index = candidates.filter((item) => {
      const layout = dragLayout[item.id];
      return layout && y > layout.top + layout.height / 2;
    }).length;
    if (dragDestination?.column !== column || dragDestination.index !== index)
      dragDestination = { column, index };
  }
  function dropTask(column: string, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const source = items.find((item) => item.id === dragged);
    const destination = dragDestination;
    finishDrag();
    if (!source) return;
    if (!destination || destination.column !== column) return;
    const candidates = visibleItems
      .filter((item) => item.column === column && item.id !== source.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const target = candidates[destination.index] ?? candidates.at(-1);
    if (target) void reorder(source, target, destination.index === candidates.length);
    else if (source.column !== column) void move(source, column);
  }
  let mobileMoveItem = $state<Item | null>(null),
    mobileDropTarget = $state<string | null>(null);
  let touchPress: { item: Item; x: number; y: number } | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let suppressTaskClick: string | null = null;
  let statusName = $state(''),
    addingStatus = $state(false),
    statusColor = $state('#8777b5');
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
  let lastTrigger: HTMLElement | null = null;
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
  async function move(item: Item, column: string) {
    if (item.column === column || busy) return;
    await saveOrder(item, column, [...columnItems(column), item]);
  }

  function columnItems(column: string) {
    return items
      .filter((item) => item.column === column)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  }
  async function reorder(item: Item, target: Item, after = false) {
    if (busy || item.id === target.id) return;
    const previous = columnItems(target.column);
    const ordered = previous.filter((candidate) => candidate.id !== item.id);
    ordered.splice(
      ordered.findIndex((candidate) => candidate.id === target.id) + Number(after),
      0,
      item
    );
    if (
      item.column === target.column &&
      ordered.every((candidate, index) => candidate.id === previous[index]?.id)
    )
      return;
    await saveOrder(item, target.column, ordered);
  }
  async function saveOrder(item: Item, column: string, ordered: Item[]) {
    optimisticOrder = { column, ids: ordered.map((candidate) => candidate.id) };
    try {
      await run(async () => {
        await api<Item[]>(`/platform/boards/${boardId}/order`, 'PUT', {
          column,
          items: ordered.map(({ id, version }) => ({ id, version })),
          ...(item.column !== column ? { move: { id: item.id, fromColumn: item.column } } : {})
        });
      });
    } finally {
      optimisticOrder = null;
    }
  }

  function step(item: Item, direction: number) {
    const ordered = columnItems(item.column);
    const target = ordered[ordered.findIndex((candidate) => candidate.id === item.id) + direction];
    if (target) void reorder(item, target, direction > 0);
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
      <h4>Board labels</h4>
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
    <p class="manage-labels-hint">Remove a label from tasks before deleting it from the board.</p>

    {#if normalizedLabels.length === 0}
      <p class="muted">No labels on this board yet.</p>
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
  role="group"
  bind:this={boardElement}
  class:drag-active={!!dragged}
  style:grid-template-columns={`repeat(${activeStatuses.length}, minmax(260px, 1fr))`}
  ondragover={(event) => {
    if (dragged) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }
  }}
  ondrop={(event) => {
    if (dragged && dragDestination) dropTask(dragDestination.column, event);
  }}
  ondragleave={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) {
      over = null;
      dragDestination = null;
    }
  }}
>
  {#each activeStatuses as status (status.id)}
    <section
      class="board-column"
      class:drop-target={over === status.id}
      aria-label={label(status)}
      ondragenter={(event) => previewDrag(status.id, event)}
      ondragover={(event) => previewDrag(status.id, event)}
      ondrop={(event) => dropTask(status.id, event)}
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
        <a
          id={`add-${status.id}`}
          class="icon-button"
          aria-label={`${'Add task to'} ${label(status)}`}
          href={newTaskHref(status.id)}><Plus size={17} aria-hidden="true" /></a
        >
      </div>
      <div
        class="column-items"
        style:padding-bottom={`${dragPreview.slot?.column === status.id ? dragPreview.slot.extraSpace : 0}px`}
      >
        {#if dragPreview.slot?.column === status.id}
          <div
            class="drag-slot"
            aria-hidden="true"
            style:top={`${dragPreview.slot.top}px`}
            style:height={`${dragPreview.slot.height}px`}
          ></div>
        {/if}
        {#each visibleItems
          .filter((i) => i.column === status.id)
          .sort((a, b) => a.position - b.position) as item (item.id)}
          <a
            href={taskHref(item.id)}
            class="kanban-card task-card"
            data-item-id={item.id}
            animate:flip={{ duration: prefersReducedMotion.current ? 0 : 180 }}
            style:translate={`0 ${dragPreview.offsets.get(item.id) ?? 0}px`}
            class:dragging={dragged === item.id}
            draggable={!busy}
            aria-disabled={busy}
            onpointerdown={(event) => beginMobileHold(item, event)}
            onkeydown={(event) => {
              if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                event.preventDefault();
                step(item, event.key === 'ArrowUp' ? -1 : 1);
              }
            }}
            ondragstart={(event) => {
              if (touchPress?.item.id === item.id || mobileMoveItem?.id === item.id) {
                event.preventDefault();
                return;
              }
              startDrag(item, event);
            }}
            ondragend={finishDrag}
            onclick={(event) => {
              if (busy) {
                event.preventDefault();
                return;
              }
              if (suppressTaskClick === item.id) {
                suppressTaskClick = null;
                event.preventDefault();
              }
            }}
          >
            <span class="task-title">
              <strong>{item.title}</strong>
              <GripVertical size={14} aria-hidden="true" />
              {#if item.referenceNumber}<span class="task-reference">#{item.referenceNumber}</span
                >{/if}</span
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
            {#if item.dueAt || item.assigneeIds?.length}<div class="task-meta">
                {#if item.dueAt}<div
                    class="task-meta-row"
                    class:overdue={new Date(item.dueAt).getTime() < Date.now() &&
                      item.column !== 'done'}
                    title={'Due'}
                  >
                    <CalendarClock size={13} aria-hidden="true" />
                    <time datetime={item.dueAt}>{formatDateTime(item.dueAt)}</time>
                  </div>{/if}
                {#if item.assigneeIds?.length}<div class="task-meta-row" title={'Assigned to'}>
                    <Users size={13} aria-hidden="true" />
                    <Assignees
                      value={item.assigneeIds}
                      {members}
                      {language}
                      readonly
                      showLabel={false}
                    />
                  </div>{/if}
              </div>{/if}
          </a>
        {/each}
      </div>
      <a class="column-add" href={newTaskHref(status.id)}
        ><Plus size={16} aria-hidden="true" />{'Add task'}</a
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
      <label for="label-name">Label name</label>
      <input
        id="label-name"
        bind:value={labelDraftName}
        maxlength="50"
        required
        placeholder={'e.g. bug, docs'}
      />

      <label for="label-desc">Description (optional)</label>
      <input
        id="label-desc"
        bind:value={labelDraftDescription}
        maxlength="200"
        placeholder={'Brief description'}
      />

      <label for="label-color">Color</label>
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
          Cancel
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
        <label for="status-name" class="sr-only">Status name</label><input
          id="status-name"
          bind:value={statusName}
          placeholder={'Status name'}
          maxlength="60"
          required
        /><input type="color" aria-label={'Status color'} bind:value={statusColor} /><button
          class="btn btn-outline"
          disabled={busy || !statusName.trim()}>Add status</button
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
    <summary>Deleted statuses</summary>{#each statuses.filter((s) => s.deleted) as status}<button
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
      <h2 id="status-heading">Edit status</h2>
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
      <label for="edit-status-name">Name</label><input
        id="edit-status-name"
        bind:value={editingStatus.name}
        required
        maxlength="60"
      />
      <label for="edit-status-color">Color</label><input
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
          >Cancel</button
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
    border-radius: var(--radius-md);
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
    border-radius: var(--radius-sm);
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
  .label-badge {
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
  .label-dialog {
    width: min(540px, calc(100vw - 32px));
  }
  .label-preview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
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
    border-radius: var(--radius-lg);
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
    border-radius: var(--radius-lg);
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
  .board {
    overflow-x: auto;
    padding: 3px 3px 12px;
  }
  .column-items {
    position: relative;
    transition: padding-bottom 180ms ease;
  }
  .board-column {
    padding: 0 12px 12px;
    transition:
      background-color 180ms ease,
      border-color 180ms ease;
  }
  .drag-slot {
    position: absolute;
    left: 0;
    right: 0;
    border: 1px dashed var(--accent);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    pointer-events: none;
    transition:
      top 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
      height 180ms ease;
  }

  .task-card {
    width: 100%;
    text-align: left;
    text-decoration: none;
    color: var(--ink);
    border: 1px solid var(--line);
    cursor: grab;
    display: grid;
    gap: 9px;
    margin-bottom: 8px;
    transition:
      translate 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 120ms ease,
      border-color var(--dur-fast) ease,
      box-shadow var(--dur) ease;
  }
  .task-card:hover {
    border-color: var(--control-border-hover);
  }
  .task-card:active {
    cursor: grabbing;
  }
  .board.drag-active .task-card:not(.dragging) {
    pointer-events: none;
  }
  .task-card.dragging {
    opacity: 0.15;
  }
  @media (prefers-reduced-motion: reduce) {
    .column-items,
    .board-column,
    .drag-slot,
    .task-card {
      transition: none;
    }
  }
  .task-title {
    display: flex;
    gap: 10px;
    align-items: start;
  }
  .task-title :global(strong) {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.4;
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
  /* `.kanban-card strong` (card titles) must not turn inline bold into a block. */
  .kanban-markdown-preview :global(strong) {
    display: inline;
    margin: 0;
    font-size: inherit;
    font-weight: 600;
    line-height: inherit;
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
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    padding: 28px;
    overflow: auto;
    box-shadow: var(--shadow-lg);
  }
  .issue-dialog::backdrop {
    background: rgb(12 13 15 / 0.42);
    backdrop-filter: blur(2px);
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
  .issue-editor {
    display: grid;
    gap: 10px;
    margin-bottom: 24px;
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
      border-radius: var(--radius-xl);
      background: var(--surface);
      box-shadow: var(--shadow-lg);
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
      border-radius: var(--radius-lg);
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
  }

  .task-reference {
    flex: 0 0 auto;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.4;
  }
  .task-meta {
    display: grid;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 12px;
  }
  .task-meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }
  .task-meta-row :global(svg) {
    flex-shrink: 0;
    color: currentColor;
    opacity: 0.75;
  }
  .task-meta-row time {
    color: inherit;
  }
  .overdue {
    color: var(--danger);
    font-weight: 600;
  }
</style>
