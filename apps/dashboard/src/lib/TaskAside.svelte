<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { labelColorStyle } from 'shared/label-colors';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import Assignees from './Assignees.svelte';
  import WatchButton from './WatchButton.svelte';
  import ContentHistory from './ContentHistory.svelte';
  import DateTimePicker from '@ksi-core/ui/platform/DateTimePicker.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { AssignmentMember, BoardLabel, Item } from '$lib/types';
  import { Archive, Plus, X } from '@lucide/svelte';
  import {
    Banner,
    Button,
    Divider,
    DropdownMenu,
    HStack,
    IconButton,
    MetadataList,
    MetadataListItem,
    Text,
    VStack
  } from '@astryx-sv/core';

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

  const labelMenuItems = $derived(
    unassignedLabels.map((label) => ({
      id: label.name,
      label: label.name,
      onClick: () => addLabel(label.name)
    }))
  );
</script>

{#snippet plusIcon()}<Plus size={13} aria-hidden="true" />{/snippet}

<VStack as="aside" class="detail-aside task-aside" gap={4} aria-label="Szczegóły zadania">
  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <Divider />
  {#if created}
    <MetadataList>
      <MetadataListItem label="Utworzono">
        <time datetime={item.createdAt}>{created}</time>
      </MetadataListItem>
    </MetadataList>
  {/if}

  <Divider />
  <VStack gap={2}>
    <Text type="label" weight="semibold" color="secondary">Przypisane osoby</Text>
    <Assignees
      value={item.assigneeIds ?? []}
      {members}
      showLabel={false}
      disabled={busy}
      onchange={changeAssignees}
    />
  </VStack>

  <Divider />
  <VStack gap={2}>
    <Text type="label" weight="semibold" color="secondary">Etykiety</Text>
    <HStack gap={1.5} wrap="wrap" vAlign="center">
      {#each item.labels as labelName (labelName)}
        {@const label = labels.find((candidate) => candidate.name === labelName)}
        <span class="label-badge" style={labelColorStyle(label?.color)}>
          <span class="label-dot"></span>
          <span class="label-name">{labelName}</span>
          <IconButton
            label={`Usuń etykietę ${labelName}`}
            tooltip={`Usuń etykietę ${labelName}`}
            variant="ghost"
            size="sm"
            isDisabled={busy}
            onclick={() => removeLabel(labelName)}
          >
            {#snippet icon()}<X size={11} aria-hidden="true" />{/snippet}
          </IconButton>
        </span>
      {:else}
        <Text type="supporting" color="secondary">Brak etykiet</Text>
      {/each}
      {#if unassignedLabels.length}
        <DropdownMenu
          button={{
            label: 'Dodaj etykietę',
            variant: 'secondary',
            size: 'sm',
            icon: plusIcon
          }}
          items={labelMenuItems}
          hasChevron={false}
          menuWidth={200}
        />
      {/if}
    </HStack>
  </VStack>

  <Divider />
  <HStack gap={1.5} vAlign="end">
    <VStack gap={0} class="aside-due-picker">
      <DateTimePicker bind:value={deadlineValue} disabled={busy} />
    </VStack>
    {#if item.dueAt}
      <IconButton
        label="Usuń termin"
        tooltip="Usuń termin"
        variant="secondary"
        isDisabled={busy}
        onclick={clearDeadline}
      >
        {#snippet icon()}<X size={14} aria-hidden="true" />{/snippet}
      </IconButton>
    {/if}
  </HStack>

  <Divider />
  <VStack gap={2}>
    <Text type="label" weight="semibold" color="secondary">Powiadomienia</Text>
    {#key (item.assigneeIds ?? []).join(',')}
      <WatchButton type="item" id={item.id} showLabel />
    {/key}
  </VStack>

  <Divider />
  <VStack gap={2} hAlign="start">
    <ContentHistory kind="task" targetId={item.id} labeled />
    <Button variant="secondary" label="Zarchiwizuj zadanie" isDisabled={busy} onclick={archive}>
      {#snippet icon()}<Archive size={15} aria-hidden="true" />{/snippet}
    </Button>
  </VStack>
</VStack>

<style>
  :global(.aside-due-picker) {
    flex: 1;
    min-width: 0;
  }
  .label-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-0-5) var(--spacing-2);
    border: 1px solid color-mix(in srgb, var(--label-color) 45%, transparent);
    border-radius: var(--radius-full);
    background: var(--label-bg);
    color: var(--label-fg);
    font-size: var(--text-supporting-size);
    font-weight: var(--font-weight-medium);
  }
  .label-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--label-color);
    flex-shrink: 0;
  }
  .label-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
