<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, type Workspace } from '$lib/navigation';
  import type { BoardStatus, Item } from '$lib/types';
  import {
    Banner,
    Button,
    EmptyState,
    Heading,
    HStack,
    Icon,
    Link,
    List,
    ListItem,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft, Archive, RotateCcw, Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    items,
    statuses,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    items: Item[];
    statuses: BoardStatus[];
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');

  const columnLabel = (id: string) => {
    if (id === 'todo') return 'Do zrobienia';
    if (id === 'progress') return 'W trakcie';
    if (id === 'done') return 'Gotowe';
    return statuses.find((status) => status.id === id)?.name ?? id;
  };

  async function restore(item: Item) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await api(`/platform/items/${item.id}/restore`, 'POST', { version: item.version });
      await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={5}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <Heading level={1}>Usunięte zadania</Heading>
    <Button
      href={dashboardPath(workspace, projectSlug, 'board')}
      variant="secondary"
      label="Wróć do tablicy"
    >
      {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <Banner
    status="info"
    title="Usunięte zadania"
    description="Usunięte zadania są przechowywane tutaj. Liderzy mogą przywrócić je do poprzedniej kolumny."
  >
    {#snippet icon()}<Archive size={18} aria-hidden="true" />{/snippet}
  </Banner>

  {#if items.length}
    <List hasDividers edge="outset">
      {#each items as item (item.id)}
        <ListItem align="start">
          {#snippet label()}
            <Link
              href={taskPath(workspace, projectSlug, item.referenceNumber ?? item.id)}
              color="primary"
              weight="medium"
            >
              {item.title}
            </Link>
          {/snippet}
          {#snippet description()}
            <VStack gap={2}>
              <Text as="p" type="supporting">{item.markdown.slice(0, 180)}</Text>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Token label={columnLabel(item.column)} />
                {#if item.deletedAt}
                  <Text type="supporting">
                    <time datetime={item.deletedAt}>{formatDate(item.deletedAt, language)}</time>
                  </Text>
                {/if}
              </HStack>
            </VStack>
          {/snippet}
          {#snippet endContent()}
            <Button
              variant="secondary"
              size="sm"
              label="Przywróć"
              isDisabled={busy}
              onclick={() => restore(item)}
            >
              {#snippet icon()}<RotateCcw size={15} aria-hidden="true" />{/snippet}
            </Button>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  {:else}
    <EmptyState
      title="Brak usuniętych zadań"
      description="Usunięte z tablicy zadania pojawią się tutaj."
      headingLevel={2}
    >
      {#snippet icon()}<Icon icon={Trash2} size="lg" color="secondary" />{/snippet}
    </EmptyState>
  {/if}
</VStack>
