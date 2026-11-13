<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { formatDateTime } from 'shared/format';
  import { PRESET_LABEL_COLORS, labelColorStyle } from 'shared/label-colors';
  import { onMount, tick, untrack } from 'svelte';
  import Assignees, { type AssignmentMember } from './Assignees.svelte';
  import KanbanFilters from './KanbanFilters.svelte';
  import {
    deadlineUrgency,
    filterTasks,
    involvedTaskIds,
    parseTaskFilters,
    renameFilterLabel,
    writeTaskFilters,
    type TaskFilters,
    type TaskInvolvement
  } from './task-filters';
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
    CalendarClock
  } from '@lucide/svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import {
    Badge,
    Button,
    Card,
    CheckboxInput,
    Dialog,
    DialogHeader,
    Heading,
    HStack,
    IconButton,
    List,
    ListItem,
    Section,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
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
    involvement = null,
    statuses,
    boardLabels = [],
    boardId,
    projectId,
    canManage = false,
    userId,
    taskHref,
    newTaskHref,
    refresh,
    reportError
  }: {
    items: Item[];
    involvement?: TaskInvolvement | null;
    statuses: BoardStatus[];
    boardLabels?: (string | BoardLabel)[];
    boardId: string;
    projectId: string;
    canManage?: boolean;
    userId?: string;
    taskHref: (item: Item) => string;
    newTaskHref: (status: string) => string;
    refresh: () => Promise<void>;
    reportError: (error: string) => void;
  } = $props();
  const language = $derived(preferences.language);

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

  let labelDialogOpen = $state(false);
  let labelDraftName = $state('');
  let labelDraftColor = $state('#6b7280');
  let labelDraftDescription = $state('');
  let labelFormError = $state('');
  let editingLabelName = $state<string | null>(null);
  let managingLabels = $state(false);
  let manageLabelError = $state('');

  $effect(() => {
    void boardId;
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

  // Filters live in the URL so a filtered board can be shared or bookmarked. The search
  // box filters as you type and writes the URL after a short pause.
  const urlFilters = $derived(parseTaskFilters(page.url.searchParams));
  let searchDraft = $state(untrack(() => urlFilters.query));
  let writtenQuery = untrack(() => urlFilters.query);
  let queryTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const query = urlFilters.query;
    // Adopt changes made elsewhere (navigation, history) without undoing in-progress typing.
    if (query.trim() === writtenQuery.trim()) return;
    clearTimeout(queryTimer);
    writtenQuery = query;
    searchDraft = query;
  });
  const filters = $derived<TaskFilters>({ ...urlFilters, query: searchDraft });
  function applyFilters(next: TaskFilters) {
    clearTimeout(queryTimer);
    writtenQuery = next.query;
    searchDraft = next.query;
    const search = writeTaskFilters(page.url.searchParams, next).toString();
    if (search === page.url.searchParams.toString()) return;
    void goto(`${page.url.pathname}${search ? `?${search}` : ''}${page.url.hash}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }
  function setQuery(query: string) {
    searchDraft = query;
    clearTimeout(queryTimer);
    queryTimer = setTimeout(() => applyFilters({ ...urlFilters, query }), 300);
  }
  // Deadline windows and overdue styling move with the clock.
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(queryTimer);
    };
  });
  const involved = $derived(involvedTaskIds(involvement));
  const visibleItems = $derived(
    filterTasks(displayedItems, filters, { userId: userId ?? '', now, involved })
  );

  function openLabelDialog(existing?: BoardLabel) {
    editingLabelName = existing?.name ?? null;
    labelDraftName = existing?.name ?? '';
    labelDraftColor = existing?.color || '#6b7280';
    labelDraftDescription = existing?.description ?? '';
    labelFormError = '';
    labelDialogOpen = true;
    void tick().then(() => document.getElementById('label-name')?.focus());
  }

  function closeLabelDialog() {
    labelDialogOpen = false;
    editingLabelName = null;
    labelFormError = '';
  }

  async function submitLabel() {
    const trimmed = labelDraftName.trim();
    if (!trimmed) return;
    const originalName = editingLabelName;
    labelFormError = '';
    const saved = await run(async () => {
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
        closeLabelDialog();
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        labelFormError =
          code === 'LABEL_ALREADY_EXISTS'
            ? 'Etykieta o tej nazwie już istnieje.'
            : code === 'INVALID_BOARD_LABELS'
              ? 'Nieprawidłowa etykieta lub nazwa jest już używana.'
              : code;
        throw new Error(labelFormError);
      }
    });
    if (saved && originalName !== null)
      applyFilters(renameFilterLabel(filters, originalName, trimmed));
  }

  async function deleteLabel(name: string) {
    manageLabelError = '';
    const deleted = await run(async () => {
      const id = await ensureBoard();
      try {
        await api(`/platform/boards/${id}/labels/${encodeURIComponent(name)}`, 'DELETE');
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg === 'LABEL_IN_USE') {
          manageLabelError =
            'Nie można usunąć etykiety, ponieważ jest przypisana do zadań na tablicy. Usuń ją najpierw z zadań.';
          throw new Error(manageLabelError);
        }
        throw err;
      }
    });
    if (deleted) applyFilters(renameFilterLabel(filters, name, null));
  }
  let members = $state<AssignmentMember[]>([]);
  const formatTaskDateTime = (iso: string) => formatDateTime(iso, language);
  // Cards show a short deadline; the full date and time is in the tooltip.
  const formatShortDue = (iso: string) =>
    formatDateTime(iso, language, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      ...(new Date(iso).getFullYear() === new Date(now).getFullYear() ? {} : { year: 'numeric' })
    });
  $effect(() => {
    const controller = new AbortController();
    const path = projectId ? `/projects/${encodeURIComponent(projectId)}/members` : '/members';
    fetch(`/api/platform${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Nie udało się wczytać osób');
        const result = await response.json();
        if (!controller.signal.aborted) members = result;
      })
      .catch(() => {});
    return () => controller.abort();
  });
  const label = (s: BoardStatus) =>
    s.id === 'todo' && s.name === 'To do'
      ? 'Do zrobienia'
      : s.id === 'progress' && s.name === 'In progress'
        ? 'W trakcie'
        : s.id === 'done' && s.name === 'Done'
          ? 'Gotowe'
          : s.name;
  const color = (s: BoardStatus) => colorForStatus(s);
  const activeStatuses = $derived(statuses.filter((s) => !s.deleted));
  let editingStatus = $state<BoardStatus | null>(null),
    statusDialogOpen = $state(false),
    statusError = $state('');
  let busy = $state(false),
    dragged = $state<string | null>(null),
    over = $state<string | null>(null);
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
    document
      .getElementById('kanban-board')
      ?.querySelectorAll<HTMLElement>('[data-item-id]')
      .forEach((element) => {
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
    if (!response.ok)
      throw new Error(result?.code ?? result?.message ?? 'Żądanie nie powiodło się.');
    return result;
  }
  async function run(work: () => Promise<void>): Promise<boolean> {
    if (busy) return false;
    busy = true;
    reportError('');
    try {
      await work();
      await refresh();
      return true;
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Żądanie nie powiodło się');
      return false;
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
    statusDialogOpen = true;
  }
  function closeStatus() {
    statusDialogOpen = false;
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
      const message = e instanceof Error ? e.message : 'Błąd';
      statusError =
        message === 'STATUS_HAS_LIVE_ITEMS'
          ? 'Przenieś lub usuń najpierw wszystkie aktywne zadania z tego statusu.'
          : message === 'INVALID_BOARD_STATUSES'
            ? 'Tablica musi mieć od 1 do 20 aktywnych statusów.'
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

<KanbanFilters
  {filters}
  {members}
  labels={normalizedLabels}
  {userId}
  visibleCount={visibleItems.length}
  totalCount={items.length}
  onchange={applyFilters}
  onquery={setQuery}
  labelManagement={canManage && managingLabels ? labelManagement : undefined}
  labelActions={canManage ? labelActions : undefined}
/>

{#snippet labelActions(close: () => void)}
  <Button
    variant="secondary"
    size="sm"
    label={managingLabels ? 'Filtruj według etykiety' : 'Zarządzaj etykietami'}
    isDisabled={busy}
    onclick={() => (managingLabels = !managingLabels)}
  >
    {#snippet icon()}<Settings2 size={15} aria-hidden="true" />{/snippet}
  </Button>
  <Button
    variant="secondary"
    size="sm"
    label="Nowa etykieta"
    isDisabled={busy}
    onclick={() => {
      close();
      openLabelDialog();
    }}
  >
    {#snippet icon()}<Plus size={15} aria-hidden="true" />{/snippet}
  </Button>
{/snippet}

{#snippet labelBadge(name: string, color?: string, description?: string)}
  <span class="label-badge" style={labelColorStyle(color)} title={description || name}>
    <span class="label-dot"></span>
    <span class="label-name">{name}</span>
  </span>
{/snippet}

{#snippet labelManagement(close: () => void)}
  <VStack gap={3} aria-label="Zarządzaj etykietami">
    <HStack gap={2} vAlign="center" justify="between">
      <Heading level={3}>Etykiety tablicy</Heading>
      <IconButton
        label="Zamknij"
        tooltip="Zamknij"
        variant="ghost"
        size="sm"
        onclick={() => (managingLabels = false)}
      >
        {#snippet icon()}<X size={16} aria-hidden="true" />{/snippet}
      </IconButton>
    </HStack>
    {#if manageLabelError}
      <Text role="alert" class="manage-label-error">{manageLabelError}</Text>
    {/if}
    <Text type="supporting" color="secondary">
      Usuń etykietę z zadań przed usunięciem jej z tablicy.
    </Text>

    {#if normalizedLabels.length === 0}
      <Text type="supporting" color="secondary">Brak etykiet na tej tablicy.</Text>
    {:else}
      <List>
        {#each normalizedLabels as boardLabel (boardLabel.name)}
          <ListItem>
            {#snippet label()}{@render labelBadge(
                boardLabel.name,
                boardLabel.color,
                boardLabel.description
              )}{/snippet}
            {#snippet description()}
              {#if boardLabel.description}<Text type="supporting" color="secondary"
                  >{boardLabel.description}</Text
                >{/if}
            {/snippet}
            {#snippet endContent()}
              <HStack gap={1}>
                <IconButton
                  label="Edytuj etykietę"
                  tooltip="Edytuj etykietę"
                  variant="ghost"
                  size="sm"
                  isDisabled={busy}
                  onclick={() => {
                    close();
                    openLabelDialog(boardLabel);
                  }}
                >
                  {#snippet icon()}<Pencil size={14} aria-hidden="true" />{/snippet}
                </IconButton>
                <IconButton
                  label="Usuń etykietę"
                  tooltip="Usuń etykietę"
                  variant="destructive"
                  size="sm"
                  isDisabled={busy}
                  onclick={() => void deleteLabel(boardLabel.name)}
                >
                  {#snippet icon()}<Trash2 size={14} aria-hidden="true" />{/snippet}
                </IconButton>
              </HStack>
            {/snippet}
          </ListItem>
        {/each}
      </List>
    {/if}
  </VStack>
{/snippet}

<VStack
  id="kanban-board"
  class={`board${dragged ? ' drag-active' : ''}`}
  gap={0}
  role="group"
  style={`display: grid; grid-template-columns: repeat(${activeStatuses.length}, minmax(260px, 1fr))`}
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
    <Section
      variant="muted"
      padding={0}
      class={`board-column${over === status.id ? ' drop-target' : ''}`}
      style="display: flex; flex-direction: column; min-height: 330px"
      aria-label={label(status)}
      ondragenter={(event) => previewDrag(status.id, event)}
      ondragover={(event) => previewDrag(status.id, event)}
      ondrop={(event) => dropTask(status.id, event)}
    >
      <HStack gap={2} vAlign="center" class="column-header">
        <HStack gap={2} vAlign="center" class="column-label">
          <span class="column-dot" style:background={color(status)}></span>
          <Text as="span" weight="medium">{label(status)}</Text>
          <Badge
            label={String(visibleItems.filter((i) => i.column === status.id).length)}
            variant="neutral"
          />
        </HStack>
        {#if canManage}
          <IconButton
            label={`Edytuj status: ${label(status)}`}
            tooltip={`Edytuj status: ${label(status)}`}
            variant="ghost"
            size="sm"
            isDisabled={busy}
            onclick={(event) => openStatus(status, event)}
          >
            {#snippet icon()}<Pencil size={15} aria-hidden="true" />{/snippet}
          </IconButton>
        {/if}
        <IconButton
          label={`Dodaj zadanie do ${label(status)}`}
          tooltip={`Dodaj zadanie do ${label(status)}`}
          variant="ghost"
          size="sm"
          href={newTaskHref(status.id)}
        >
          {#snippet icon()}<Plus size={17} aria-hidden="true" />{/snippet}
        </IconButton>
      </HStack>
      <VStack
        gap={2}
        class="column-items"
        style={`padding-bottom: ${dragPreview.slot?.column === status.id ? dragPreview.slot.extraSpace : 0}px`}
      >
        {#if dragPreview.slot?.column === status.id}
          <VStack
            class="drag-slot"
            gap={0}
            aria-hidden="true"
            style={`top: ${dragPreview.slot.top}px; height: ${dragPreview.slot.height}px`}
          ></VStack>
        {/if}
        {#each visibleItems
          .filter((i) => i.column === status.id)
          .sort((a, b) => a.position - b.position) as item (item.id)}
          <a
            href={taskHref(item)}
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
            <VStack gap={2}>
              <HStack gap={2} align="start" class="task-title">
                <Text as="span" weight="medium" maxLines={3} class="task-title-text"
                  >{item.title}</Text
                >
                <GripVertical size={14} aria-hidden="true" />
                {#if item.referenceNumber}
                  <Text as="span" type="code" color="secondary" class="task-reference"
                    >#{item.referenceNumber}</Text
                  >
                {/if}
              </HStack>
              {#if item.markdown}
                <VStack gap={0} class="kanban-markdown-preview">
                  <MarkdownContent value={item.markdown} />
                </VStack>
              {/if}
              {#if item.labels.length}
                <HStack gap={1} wrap="wrap">
                  {#each item.labels as labelName (labelName)}
                    {@const label = labelMap.get(labelName)}
                    {@render labelBadge(labelName, label?.color, label?.description)}
                  {/each}
                </HStack>
              {/if}
              {#if item.dueAt || item.assigneeIds?.length}
                <HStack gap={2} vAlign="center" justify="between" wrap="wrap" class="task-meta">
                  {#if item.dueAt}
                    {@const urgency = deadlineUrgency(item, now)}
                    <span
                      class:overdue={urgency === 'overdue'}
                      class:due-soon={urgency === 'soon'}
                      class="task-due"
                      title={formatTaskDateTime(item.dueAt)}
                    >
                      <CalendarClock size={13} aria-hidden="true" />
                      <span class="visually-hidden">
                        {urgency === 'overdue' ? 'Po terminie' : 'Termin'}
                      </span>
                      <time datetime={item.dueAt}>{formatShortDue(item.dueAt)}</time>
                    </span>
                  {/if}
                  {#if item.assigneeIds?.length}
                    <span class="task-assignees" title="Przypisane do">
                      <Assignees
                        value={item.assigneeIds}
                        {members}
                        readonly
                        showLabel={false}
                        stacked={item.assigneeIds.length > 1}
                      />
                    </span>
                  {/if}
                </HStack>
              {/if}
            </VStack>
          </a>
        {/each}
      </VStack>
      <HStack padding={2}>
        <Button variant="ghost" size="sm" label="Dodaj zadanie" href={newTaskHref(status.id)}>
          {#snippet icon()}<Plus size={16} aria-hidden="true" />{/snippet}
        </Button>
      </HStack>
    </Section>
  {/each}
</VStack>

{#if mobileMoveItem}
  <Card class="mobile-move-tray" role="group" aria-label="Przenieś zadanie do kategorii">
    <VStack gap={3}>
      <HStack gap={3} vAlign="center" justify="between">
        <Text as="span" maxLines={1}>
          Przenieś zadanie do <Text as="span" weight="semibold">{mobileMoveItem.title}</Text>
        </Text>
        <IconButton
          label="Zamknij"
          tooltip="Zamknij"
          variant="ghost"
          size="sm"
          onclick={cancelMobileMove}
        >
          {#snippet icon()}<X size={18} aria-hidden="true" />{/snippet}
        </IconButton>
      </HStack>
      <VStack gap={2} class="mobile-move-options">
        {#each activeStatuses as status (status.id)}
          {@const tone = color(status)}
          <Button
            variant="secondary"
            label={label(status)}
            data-mobile-status={status.id}
            class={`mobile-move-option${mobileDropTarget === status.id ? ' drop-target' : ''}`}
            isDisabled={busy}
            onclick={() => finishMobileMove(status.id)}
          >
            {#snippet icon()}<span class="column-dot" style:background={tone}></span>{/snippet}
          </Button>
        {/each}
      </VStack>
    </VStack>
  </Card>
{/if}

{#if canManage}
  <Dialog
    isOpen={labelDialogOpen}
    onOpenChange={(isOpen) => {
      if (!isOpen) closeLabelDialog();
    }}
    width={540}
    purpose="form"
  >
    <VStack gap={4}>
      <DialogHeader
        title={editingLabelName === null ? 'Utwórz nową etykietę' : 'Edytuj etykietę'}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeLabelDialog();
        }}
      />
      <Card variant="muted">
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Text type="label" weight="semibold">Podgląd:</Text>
          {@render labelBadge(
            labelDraftName.trim() || 'Nazwa etykiety',
            labelDraftColor,
            labelDraftDescription
          )}
          {#if labelDraftDescription.trim()}
            <Text type="supporting" color="secondary">{labelDraftDescription.trim()}</Text>
          {/if}
        </HStack>
      </Card>

      {#if labelFormError}
        <Text role="alert" class="manage-label-error">{labelFormError}</Text>
      {/if}

      <form
        onsubmit={(event) => {
          event.preventDefault();
          void submitLabel();
        }}
      >
        <VStack gap={3}>
          <TextInput
            id="label-name"
            label="Nazwa etykiety"
            value={labelDraftName}
            onChange={(value) => (labelDraftName = value.slice(0, 50))}
            isRequired
            placeholder="np. bug, docs"
          />
          <TextInput
            id="label-desc"
            label="Opis (opcjonalny)"
            value={labelDraftDescription}
            onChange={(value) => (labelDraftDescription = value.slice(0, 200))}
            placeholder="Krótki opis przeznaczenia etykiety"
          />
          <VStack gap={2}>
            <Text type="label" weight="medium">Kolor</Text>
            <HStack gap={2} wrap="wrap" vAlign="center">
              <input
                id="label-color"
                type="color"
                bind:value={labelDraftColor}
                class="color-input"
                aria-label="Kolor"
              />
              {#each PRESET_LABEL_COLORS as preset (preset)}
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
            </HStack>
          </VStack>
          <HStack gap={2}>
            <Button
              type="submit"
              label={editingLabelName === null ? 'Utwórz etykietę' : 'Zapisz'}
              isDisabled={busy || !labelDraftName.trim()}
            />
            <Button
              type="button"
              variant="secondary"
              label="Anuluj"
              isDisabled={busy}
              onclick={closeLabelDialog}
            />
          </HStack>
        </VStack>
      </form>
    </VStack>
  </Dialog>
{/if}

{#if canManage && activeStatuses.length < 20 && statuses.length < 100}
  <HStack gap={2} class="status-create">
    {#if addingStatus}
      <form
        onsubmit={(event) => {
          event.preventDefault();
          void addStatus();
        }}
      >
        <HStack gap={2} wrap="wrap">
          <TextInput
            id="status-name"
            label="Nazwa statusu"
            isLabelHidden
            value={statusName}
            onChange={(value) => (statusName = value.slice(0, 60))}
            placeholder="Nazwa statusu"
            isRequired
          />
          <input
            type="color"
            aria-label="Kolor statusu"
            bind:value={statusColor}
            class="color-input"
          />
          <Button
            type="submit"
            variant="secondary"
            label="Dodaj status"
            isDisabled={busy || !statusName.trim()}
          />
          <IconButton
            label="Anuluj"
            tooltip="Anuluj"
            variant="ghost"
            size="sm"
            onclick={() => (addingStatus = false)}
          >
            {#snippet icon()}<X size={16} aria-hidden="true" />{/snippet}
          </IconButton>
        </HStack>
      </form>
    {:else}
      <Button
        variant="secondary"
        label="Dodaj status"
        isDisabled={busy}
        onclick={async () => {
          addingStatus = true;
          await tick();
          document.getElementById('status-name')?.focus();
        }}
      >
        {#snippet icon()}<Plus size={15} aria-hidden="true" />{/snippet}
      </Button>
    {/if}
  </HStack>
{/if}

{#if canManage && statuses.some((s) => s.deleted)}
  <details class="deleted-statuses">
    <summary>Usunięte statusy</summary>
    <HStack gap={2} wrap="wrap">
      {#each statuses.filter((s) => s.deleted) as status (status.id)}
        <Button
          variant="secondary"
          label={label(status)}
          onclick={(event) => openStatus(status, event)}
        >
          {#snippet icon()}<Pencil size={14} aria-hidden="true" />{/snippet}
        </Button>
      {/each}
    </HStack>
  </details>
{/if}

<Dialog
  isOpen={statusDialogOpen}
  onOpenChange={(isOpen) => {
    if (!isOpen) closeStatus();
  }}
  width={560}
  purpose="form"
>
  {#if editingStatus}
    <VStack gap={4}>
      <DialogHeader
        title="Edytuj status"
        onOpenChange={(isOpen) => {
          if (!isOpen) closeStatus();
        }}
      />
      <form
        onsubmit={(event) => {
          event.preventDefault();
          void saveStatus();
        }}
      >
        <VStack gap={3}>
          <TextInput
            id="edit-status-name"
            label="Nazwa"
            bind:value={editingStatus.name}
            isRequired
          />
          <VStack gap={2}>
            <Text type="label" weight="medium">Kolor</Text>
            <input
              id="edit-status-color"
              type="color"
              value={color(editingStatus)}
              class="color-input"
              aria-label="Kolor"
              oninput={(event) => (editingStatus!.color = event.currentTarget.value)}
            />
          </VStack>
          <CheckboxInput
            label="Usunięty"
            value={!!editingStatus.deleted}
            onChange={(checked) => (editingStatus!.deleted = checked)}
          />
          {#if statusError}
            <Text role="alert" class="manage-label-error">{statusError}</Text>
          {/if}
          <HStack gap={2} wrap="wrap">
            <Button type="submit" label="Zapisz" isDisabled={busy || !editingStatus.name.trim()}>
              {#snippet icon()}<Save size={14} aria-hidden="true" />{/snippet}
            </Button>
            <Button
              type="button"
              variant="secondary"
              label="Anuluj"
              isDisabled={busy}
              onclick={closeStatus}
            />
            {#if !editingStatus.deleted}
              <Button
                type="button"
                variant="destructive"
                label="Usuń status"
                isDisabled={busy}
                onclick={() => saveStatus(true)}
              >
                {#snippet icon()}<Trash2 size={14} aria-hidden="true" />{/snippet}
              </Button>
            {/if}
          </HStack>
        </VStack>
      </form>
    </VStack>
  {/if}
</Dialog>

<style>
  :global(.board) {
    display: grid;
    align-items: start;
    gap: var(--spacing-4);
    overflow-x: auto;
    padding: var(--spacing-0-5) var(--spacing-0-5) var(--spacing-3);
  }
  :global(.board-column) {
    display: flex;
    flex-direction: column;
    min-height: 330px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-container);
  }
  :global(.board-column.drop-target) {
    border-color: var(--color-accent);
    outline: 1px solid var(--color-accent);
    outline-offset: -3px;
  }
  :global(.column-header) {
    min-height: 56px;
    padding: var(--spacing-2);
  }
  :global(.column-label) {
    margin-right: auto;
    min-width: 0;
  }
  :global(.column-items) {
    position: relative;
    flex: 1;
    padding-inline: var(--spacing-2);
    transition: padding-bottom 180ms ease;
  }
  :global(.drag-slot) {
    position: absolute;
    inset-inline: var(--spacing-2);
    border: 1px dashed var(--color-accent);
    border-radius: var(--radius-element);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    pointer-events: none;
  }
  :global(.board.drag-active) .task-card:not(.dragging) {
    pointer-events: none;
  }
  .task-card {
    display: block;
    margin-bottom: var(--spacing-2);
    padding: var(--spacing-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-element);
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    text-decoration: none;
    cursor: grab;
    transition:
      translate 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 120ms ease,
      border-color var(--duration-fast) ease;
  }
  .task-card:hover {
    border-color: var(--color-text-secondary);
  }
  .task-card:active {
    cursor: grabbing;
  }
  .task-card.dragging {
    opacity: 0.15;
  }
  :global(.task-title) {
    min-width: 0;
  }
  :global(.task-title-text) {
    flex: 1;
    min-width: 0;
  }
  :global(.task-title) :global(svg) {
    color: var(--color-text-secondary);
    opacity: 0;
    flex-shrink: 0;
  }
  .task-card:hover :global(.task-title) :global(svg) {
    opacity: 1;
  }
  :global(.kanban-markdown-preview) {
    max-height: 4.5em;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--text-supporting-size);
    line-height: 1.5;
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }
  :global(.kanban-markdown-preview) :global(:is(img, .gallery, pre, table, hr)) {
    display: none;
  }
  :global(.kanban-markdown-preview) :global(p) {
    margin: 2px 0 !important;
  }
  .label-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    max-width: 100%;
    padding: 2px 7px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--label-color) 45%, transparent);
    border-radius: var(--radius-full);
    background: var(--label-bg);
    color: var(--label-fg);
    font-size: var(--text-supporting-size);
    font-weight: var(--font-weight-medium);
    line-height: 1.2;
    white-space: nowrap;
  }
  .label-dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--label-color);
  }
  .label-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.task-meta) {
    padding-top: var(--spacing-1-5);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--text-supporting-size);
  }
  .task-due {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    min-width: 0;
    white-space: nowrap;
  }
  .overdue {
    color: var(--color-error);
    font-weight: var(--font-weight-semibold);
  }
  .due-soon {
    color: var(--color-warning);
    font-weight: var(--font-weight-semibold);
  }
  .task-assignees {
    display: flex;
    min-width: 0;
    margin-left: auto;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  :global(.mobile-move-tray) {
    position: fixed !important;
    z-index: 1000;
    inset-inline: var(--spacing-3);
    bottom: calc(var(--spacing-3) + env(safe-area-inset-bottom));
    box-shadow: var(--shadow-high);
  }
  :global(.mobile-move-options) {
    max-height: min(35dvh, 240px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  :global(.mobile-move-option.drop-target) {
    border-color: var(--color-accent);
  }
  .color-input {
    width: 42px;
    height: 36px;
    padding: 3px;
    border: 1px solid var(--color-border-emphasized);
    border-radius: var(--radius-inner);
    cursor: pointer;
  }
  .color-swatch {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--radius-full);
    cursor: pointer;
  }
  .color-swatch.active {
    border-color: var(--color-text-primary);
    box-shadow: 0 0 0 1px var(--color-background-surface);
  }
  :global(.status-create) {
    margin-top: var(--spacing-5);
  }
  .deleted-statuses {
    margin-top: var(--spacing-5);
  }
  .deleted-statuses summary {
    margin-bottom: var(--spacing-3);
    cursor: pointer;
  }
  :global(.manage-label-error) {
    color: var(--color-error);
    font-size: var(--text-supporting-size);
  }
  @media (max-width: 760px) {
    :global(.board) {
      grid-template-columns: none !important;
      grid-auto-flow: column;
      grid-auto-columns: minmax(250px, 1fr);
      touch-action: pan-x pan-y;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.column-items),
    :global(.drag-slot),
    .task-card {
      transition: none;
    }
  }
</style>
