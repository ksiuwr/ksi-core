<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Assignees from '$lib/Assignees.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, type Workspace } from '$lib/navigation';
  import { labelColorStyle } from 'shared/label-colors';
  import {
    defaultStatuses,
    type BoardData,
    type BoardLabel,
    type BoardStatus,
    type Item
  } from '$lib/types';
  import DateTimePicker from '@ksi-core/ui/platform/DateTimePicker.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import {
    Banner,
    Button,
    Divider,
    Heading,
    HStack,
    Section,
    Selector,
    Text,
    TextInput,
    ToggleButton,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft, Plus } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    board,
    items
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    board: BoardData | null;
    items: Item[];
  } = $props();
  const language = $derived(preferences.language);

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
    statuses.map((status) => ({ value: status.id, label: status.name }))
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
      await goto(taskPath(workspace, projectSlug, result.referenceNumber ?? result.id));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={4}>
  <Button
    href={dashboardPath(workspace, projectSlug, 'board')}
    variant="secondary"
    label="Tablica zadań"
  >
    {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
  </Button>

  <VStack as="header" gap={1}>
    <Heading level={1}>Nowe zadanie</Heading>
    <Text as="p" class="workspace-description">
      Dodaj szczegóły teraz; po utworzeniu zadania możesz kontynuować dyskusję.
    </Text>
  </VStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      void create();
    }}
  >
    <HStack vAlign="start" gap={5} wrap="wrap">
      <Section padding={5} class="form-main">
        <VStack gap={5}>
          <TextInput
            id="new-task-title"
            label="Tytuł zadania"
            value={title}
            onChange={(value) => (title = value)}
            isRequired
            placeholder={'Co trzeba zrobić?'}
          />
          <VStack gap={2}>
            <Text type="label" weight="semibold">Opis</Text>
            <Editor bind:value={markdown} rows={18} allowReferences />
          </VStack>
        </VStack>
      </Section>

      <Section padding={5} class="form-aside">
        <VStack gap={4}>
          <Selector
            id="new-task-status"
            label="Status"
            value={status}
            options={statusOptions}
            width="100%"
            onChange={(value: string | null) => {
              if (value !== null) status = value;
            }}
          >
            {#snippet renderOption(option)}
              <HStack gap={2} vAlign="center">
                <span
                  class="status-dot"
                  style:--dot={statuses.find((status) => status.id === option.value)?.color ??
                    'var(--muted)'}
                  aria-hidden="true"
                ></span>
                <Text type="inherit">{option.label}</Text>
              </HStack>
            {/snippet}
          </Selector>

          {#if labels.length}
            <VStack gap={2}>
              <Text type="label" weight="semibold">Etykiety</Text>
              <HStack gap={1.5} wrap="wrap">
                {#each labels as label (label.name)}
                  {@const selected = selectedLabels.includes(label.name)}
                  <ToggleButton
                    label={label.name}
                    size="sm"
                    isPressed={selected}
                    style={labelColorStyle(label.color)}
                    onPressedChange={(pressed) => {
                      selectedLabels = pressed
                        ? [...selectedLabels, label.name]
                        : selectedLabels.filter((name) => name !== label.name);
                    }}
                  >
                    {#snippet children()}
                      <span class="label-dot" aria-hidden="true"></span>{label.name}
                    {/snippet}
                  </ToggleButton>
                {/each}
              </HStack>
            </VStack>
          {/if}

          <Divider />
          <Assignees {projectId} bind:value={assignees} disabled={busy} />
          <Divider />
          <DateTimePicker bind:value={dueAt} disabled={busy} />
          <Divider />
          <VStack gap={2}>
            <Button
              type="submit"
              variant="primary"
              width="100%"
              label={busy ? 'Tworzenie…' : 'Utwórz zadanie'}
              isDisabled={busy || !title.trim() || !status}
            >
              {#snippet icon()}<Plus size={15} aria-hidden="true" />{/snippet}
            </Button>
            <Button
              href={dashboardPath(workspace, projectSlug, 'board')}
              variant="secondary"
              width="100%"
              label="Anuluj"
            />
          </VStack>
        </VStack>
      </Section>
    </HStack>
  </form>
</VStack>

<style>
  :global(.form-main) {
    flex: 1 1 32rem;
    min-width: 0;
  }
  :global(.form-aside) {
    flex: 0 1 20rem;
    min-width: 0;
    position: sticky;
    top: 5.625rem;
  }
  @media (max-width: 61.25rem) {
    :global(.form-aside) {
      flex-basis: 100%;
      position: static;
    }
  }
  :global(.label-dot) {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--label-color);
    box-shadow: 0 0 0 1px var(--label-fg);
  }
</style>
