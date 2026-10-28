<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import Assignees from './Assignees.svelte';
  import WatchButton from './WatchButton.svelte';
  import ContentHistory from './ContentHistory.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import DateTimePicker from '@ksi-core/ui/platform/DateTimePicker.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { AssignmentMember, BoardLabel, Item } from '$lib/types';
  import { Archive, Plus, X } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    item,
    labels,
    members,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    item: Item;
    labels: BoardLabel[];
    members: AssignmentMember[];
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');
  let deadlineValue = $state('');
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let deadlineSuppressed = false;

  const unassignedLabels = $derived(labels.filter((label) => !item.labels.includes(label.name)));
  const created = $derived(item.createdAt ? formatDate(item.createdAt, language) : null);

  function localDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  $effect(() => {
    if (!deadlineSuppressed) deadlineValue = localDate(item.dueAt);
  });

  $effect(() => {
    if (deadlineSuppressed) return;
    const value = deadlineValue;
    if (value === localDate(item.dueAt)) return;
    clearTimeout(deadlineTimer);
    deadlineTimer = setTimeout(() => {
      void patch({ dueAt: value ? new Date(value).toISOString() : null });
    }, 500);
  });

  onDestroy(() => clearTimeout(deadlineTimer));

  async function patch(values: Partial<Pick<Item, 'labels' | 'assigneeIds' | 'dueAt'>>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await api(`/platform/items/${encodeURIComponent(item.id)}`, 'PATCH', {
        version: item.version,
        ...values
      });
      await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  function changeAssignees(assigneeIds: string[]) {
    void patch({ assigneeIds });
  }

  function addLabel(name: string) {
    if (item.labels.includes(name)) return;
    void patch({ labels: [...item.labels, name] });
  }

  function removeLabel(name: string) {
    void patch({ labels: item.labels.filter((label) => label !== name) });
  }

  function clearDeadline() {
    clearTimeout(deadlineTimer);
    deadlineSuppressed = true;
    deadlineValue = '';
    void patch({ dueAt: null }).finally(() => {
      deadlineSuppressed = false;
    });
  }

  function archive() {
    if (busy) return;
    busy = true;
    error = '';
    void api(`/platform/items/${encodeURIComponent(item.id)}/archive`, 'POST', {
      version: item.version
    })
      .then(() => goto(dashboardPath(workspace, projectSlug, 'board')))
      .catch((cause) => {
        error = errorMessage(cause);
      })
      .finally(() => {
        busy = false;
      });
  }
</script>

<aside class="detail-aside task-aside" aria-label={'Task details'}>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <section class="aside-section">
    <dl class="metadata-list">
      {#if created}
        <div>
          <dt>Created</dt>
          <dd><time datetime={item.createdAt}>{created}</time></dd>
        </div>
      {/if}
    </dl>
  </section>

  <section class="aside-section">
    <h2>Assignees</h2>
    <Assignees
      value={item.assigneeIds ?? []}
      {members}
      showLabel={false}
      disabled={busy}
      onchange={changeAssignees}
    />
  </section>

  <section class="aside-section">
    <h2>Labels</h2>
    <div class="task-label-list">
      {#each item.labels as labelName}
        {@const label = labels.find((candidate) => candidate.name === labelName)}
        <span class="label-badge" style:--label-color={label?.color || '#6b7280'}>
          <span class="label-dot"></span>
          <span class="label-name">{labelName}</span>
          <button
            type="button"
            class="label-remove"
            aria-label={`Remove label ${labelName}`}
            title={`Remove label ${labelName}`}
            disabled={busy}
            onclick={() => removeLabel(labelName)}
          >
            <X size={11} aria-hidden="true" />
          </button>
        </span>
      {:else}
        <span class="muted">None yet</span>
      {/each}
      {#if unassignedLabels.length}
        <Dropdown
          label={'Add label'}
          placeholder={'Add label'}
          options={unassignedLabels.map((label) => ({
            value: label.name,
            label: label.name,
            color: label.color || '#6b7280'
          }))}
          variant="compact"
          disabled={busy}
          onselect={addLabel}
        >
          {#snippet leading()}<Plus size={13} aria-hidden="true" />{/snippet}
        </Dropdown>
      {/if}
    </div>
  </section>

  <section class="aside-section">
    <div class="aside-due">
      <DateTimePicker bind:value={deadlineValue} disabled={busy} />
      {#if item.dueAt}
        <button
          type="button"
          class="icon-action-btn"
          title={'Remove deadline'}
          aria-label={'Remove deadline'}
          disabled={busy}
          onclick={clearDeadline}
        >
          <X size={14} aria-hidden="true" />
        </button>
      {/if}
    </div>
  </section>

  <section class="aside-section">
    <h2>Notifications</h2>
    {#key (item.assigneeIds ?? []).join(',')}
      <WatchButton type="item" id={item.id} showLabel />
    {/key}
  </section>

  <section class="aside-section aside-actions">
    <ContentHistory kind="task" targetId={item.id} labeled />
    <button class="btn btn-outline" disabled={busy} onclick={archive}>
      <Archive size={15} aria-hidden="true" />{'Archive task'}
    </button>
  </section>
</aside>

<style>
  .aside-due {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .aside-due :global(.picker) {
    flex: 1;
    min-width: 0;
  }
  /* Same height as the picker trigger, aligned to its bottom edge. */
  .aside-due :global(.icon-action-btn) {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }
</style>
