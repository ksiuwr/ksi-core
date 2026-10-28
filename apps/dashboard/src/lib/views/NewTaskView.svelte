<script lang="ts">
  import type { FrontendLocale } from 'shared/content-locales';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Assignees from '$lib/Assignees.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, type Workspace } from '$lib/navigation';
  import {
    defaultStatuses,
    type BoardData,
    type BoardLabel,
    type BoardStatus,
    type Item
  } from '$lib/types';
  import DateTimePicker from '@ksi-core/ui/platform/DateTimePicker.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import { ArrowLeft, Check, Plus } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    board,
    items,
    language
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    board: BoardData | null;
    items: Item[];
    language: FrontendLocale;
  } = $props();

  const statuses = $derived<BoardStatus[]>(
    (board?.statuses?.length ? board.statuses : defaultStatuses).filter((status) => !status.deleted)
  );
  const labels = $derived<BoardLabel[]>(
    (board?.labels ?? []).map((label) =>
      typeof label === 'string'
        ? { name: label, color: '#6b7280' }
        : { ...label, color: label.color || '#6b7280' }
    )
  );
  const statusOptions = $derived(
    statuses.map((status) => ({ value: status.id, label: status.name, color: status.color }))
  );
  const requestedStatus = page.url.searchParams.get('status') ?? '';
  let title = $state('');
  let markdown = $state('');
  let status = $state(requestedStatus);
  let selectedLabels = $state<string[]>([]);
  let assignees = $state<string[]>([]);
  let dueAt = $state('');
  let busy = $state(false);
  let error = $state('');

  $effect(() => {
    if (!statuses.some((candidate) => candidate.id === status)) status = statuses[0]?.id ?? 'todo';
  });

  async function create() {
    if (busy || !title.trim() || !status) return;
    busy = true;
    error = '';
    try {
      const activeBoard =
        board ?? (await api<BoardData>('/platform/boards', 'POST', projectId ? { projectId } : {}));
      const result = await api<Item>(
        `/platform/boards/${encodeURIComponent(activeBoard.id)}/items`,
        'POST',
        {
          title: title.trim(),
          markdown,
          labels: selectedLabels,
          assigneeIds: assignees,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          column: status,
          position:
            Math.max(
              -1,
              ...items.filter((item) => item.column === status).map((item) => item.position)
            ) + 1
        }
      );
      await goto(taskPath(workspace, projectSlug, result.id));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<a class="btn btn-outline detail-back" href={dashboardPath(workspace, projectSlug, 'board')}
  ><ArrowLeft size={15} aria-hidden="true" />{'Task board'}</a
>
<header class="create-heading">
  <h1>New task</h1>
  <p>Add the details now; you can continue the discussion after creating the task.</p>
</header>

{#if error}<p class="error" role="alert">{error}</p>{/if}
<form
  class="detail-layout create-form"
  onsubmit={(event) => {
    event.preventDefault();
    void create();
  }}
>
  <section class="card create-main">
    <div>
      <label for="new-task-title">Task title</label>
      <input
        id="new-task-title"
        bind:value={title}
        required
        maxlength="200"
        placeholder={'What needs to be done?'}
      />
    </div>
    <div>
      <span class="create-label">Description</span>
      <Editor {language} bind:value={markdown} rows={18} allowReferences />
    </div>
  </section>

  <aside class="card create-aside">
    <section class="create-section">
      <label for="new-task-status">Status</label>
      <Dropdown
        id="new-task-status"
        label={'Task status'}
        bind:value={status}
        options={statusOptions}
      />
    </section>
    {#if labels.length}
      <section class="create-section">
        <span class="create-label">Labels</span>
        <div class="label-chips">
          {#each labels as label (label.name)}
            {@const selected = selectedLabels.includes(label.name)}
            <button
              type="button"
              class="label-chip"
              class:selected
              aria-pressed={selected}
              style:--label-color={label.color}
              onclick={() => {
                selectedLabels = selected
                  ? selectedLabels.filter((name) => name !== label.name)
                  : [...selectedLabels, label.name];
              }}
            >
              <span class="label-dot"></span>{label.name}{#if selected}<Check
                  size={12}
                  aria-hidden="true"
                />{/if}
            </button>
          {/each}
        </div>
      </section>
    {/if}
    <section class="create-section">
      <Assignees {projectId} bind:value={assignees} {language} disabled={busy} />
    </section>
    <section class="create-section">
      <DateTimePicker bind:value={dueAt} {language} disabled={busy} />
    </section>
    <div class="create-actions">
      <button class="btn" disabled={busy || !title.trim() || !status}
        ><Plus size={15} aria-hidden="true" />{busy ? 'Creating…' : 'Create task'}</button
      >
      <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'board')}>Cancel</a>
    </div>
  </aside>
</form>

<style>
  .label-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .label-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
  }
  .label-chip.selected {
    border-color: color-mix(in srgb, var(--label-color) 55%, var(--line));
    background: color-mix(in srgb, var(--label-color) 12%, var(--surface));
    color: var(--ink);
  }
  .label-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--label-color);
  }
</style>
