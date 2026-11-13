<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import Assignees from './Assignees.svelte';
  import WatchButton from './WatchButton.svelte';
  import { api, errorMessage } from '$lib/api';
  import type { AssignmentMember, Thread } from '$lib/types';
  import { Archive, RotateCcw } from '@lucide/svelte';
  import {
    Banner,
    Button,
    Divider,
    MetadataList,
    MetadataListItem,
    Text,
    VStack
  } from '@astryx-sv/core';

  let {
    thread,
    members,
    canManage,
    refresh
  }: {
    thread: Thread;
    members: AssignmentMember[];
    canManage: boolean;
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');

  const archived = $derived(!!thread.archivedAt);
  const created = $derived(thread.createdAt ? formatDate(thread.createdAt, language) : null);

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

  function updateAssignees(assigneeIds: string[]) {
    void run(() =>
      api(`/platform/threads/${encodeURIComponent(thread.id)}/assignees`, 'PATCH', {
        version: thread.version,
        assigneeIds
      })
    );
  }

  function toggleArchive() {
    void run(() =>
      api(`/platform/threads/${encodeURIComponent(thread.id)}/archive`, 'POST', {
        version: thread.version,
        archived: !archived
      })
    );
  }
</script>

<VStack as="aside" class="detail-aside" gap={4} aria-label="Szczegóły wątku">
  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <Divider />
  <MetadataList>
    <MetadataListItem label="Widoczność">
      {thread.visibility === 'leaders'
        ? 'Liderzy'
        : thread.visibility === 'members'
          ? 'Członkowie projektu'
          : 'Członkowie koła'}
    </MetadataListItem>
    {#if created}
      <MetadataListItem label="Utworzono">
        <time datetime={thread.createdAt}>{created}</time>
      </MetadataListItem>
    {/if}
  </MetadataList>

  <Divider />
  <VStack gap={2}>
    <Text type="label" weight="semibold" color="secondary">Przypisane osoby</Text>
    <Assignees
      value={thread.assigneeIds ?? []}
      {members}
      showLabel={false}
      disabled={busy || archived}
      onchange={updateAssignees}
    />
  </VStack>

  <Divider />
  <VStack gap={2}>
    <Text type="label" weight="semibold" color="secondary">Powiadomienia</Text>
    {#key (thread.assigneeIds ?? []).join(',')}
      <WatchButton type="thread" id={thread.id} showLabel />
    {/key}
  </VStack>

  {#if canManage}
    <Divider />
    <Button
      variant="secondary"
      label={archived ? 'Przywróć wątek' : 'Zarchiwizuj wątek'}
      isDisabled={busy}
      onclick={toggleArchive}
    >
      {#snippet icon()}
        {#if archived}<RotateCcw size={15} aria-hidden="true" />{:else}<Archive
            size={15}
            aria-hidden="true"
          />{/if}
      {/snippet}
    </Button>
  {/if}
</VStack>
