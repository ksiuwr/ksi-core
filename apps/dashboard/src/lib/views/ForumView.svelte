<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { newThreadPath, threadPath, type Workspace } from '$lib/navigation';
  import type { Thread } from '$lib/types';
  import {
    Button,
    EmptyState,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    SegmentedControl,
    SegmentedControlItem,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { Plus, Archive, MessagesSquare } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    threads
  }: {
    workspace: Workspace;
    projectSlug: string;
    threads: Thread[];
  } = $props();
  const language = $derived(preferences.language);

  const archived = $derived(page.url.searchParams.get('archived') === 'true');

  function setArchived(value: boolean) {
    const query = value ? '?archived=true' : '';
    void goto(`${page.url.pathname}${query}`);
  }
</script>

<VStack gap={4}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <Heading level={1}>Forum</Heading>
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Button href={newThreadPath(workspace, projectSlug)} variant="primary" label="Nowy wątek">
        {#snippet icon()}<Plus size={16} aria-hidden="true" />{/snippet}
      </Button>
      <SegmentedControl
        value={archived ? 'archived' : 'active'}
        onChange={(value) => setArchived(value === 'archived')}
        label={'Widok forum'}
        size="sm"
      >
        <SegmentedControlItem value="active" label="Aktywne" />
        <SegmentedControlItem value="archived" label="Archiwum">
          {#snippet icon()}<Archive size={14} aria-hidden="true" />{/snippet}
        </SegmentedControlItem>
      </SegmentedControl>
    </HStack>
  </HStack>

  {#if threads.length}
    <List hasDividers edge="outset">
      {#each threads as thread (thread.id)}
        <ListItem
          href={threadPath(workspace, projectSlug, thread.referenceNumber ?? thread.id)}
          label={thread.title}
        >
          {#snippet startContent()}
            <Icon icon={MessagesSquare} size="sm" color="secondary" />
          {/snippet}
          {#snippet endContent()}
            <HStack gap={2} vAlign="center" wrap="wrap">
              {#if thread.referenceNumber}
                <Text type="code">#{thread.referenceNumber}</Text>
              {/if}
              <Token
                label={thread.visibility === 'leaders'
                  ? 'Liderzy'
                  : thread.visibility === 'members'
                    ? 'Członkowie projektu'
                    : 'Członkowie koła'}
              />
              {#if thread.createdAt}
                <Text type="supporting">
                  <time datetime={thread.createdAt}>{formatDate(thread.createdAt, language)}</time>
                </Text>
              {/if}
            </HStack>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  {:else}
    <EmptyState title="Brak wątków" headingLevel={2}>
      {#snippet icon()}<Icon icon={MessagesSquare} size="lg" color="secondary" />{/snippet}
    </EmptyState>
  {/if}
</VStack>
