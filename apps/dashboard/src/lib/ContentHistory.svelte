<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime } from 'shared/format';
  import { onDestroy } from 'svelte';
  import {
    History,
    Clock3,
    ArrowDown,
    RotateCcw,
    FilePenLine,
    Plus,
    ArrowRightLeft
  } from '@lucide/svelte';
  import ChangeDetails from '@ksi-core/ui/platform/ChangeDetails.svelte';
  import type { ContentRevision, ContentRevisionPage } from 'shared/activity';
  import {
    Banner,
    Button,
    Center,
    Dialog,
    DialogHeader,
    Divider,
    EmptyState,
    HStack,
    IconButton,
    List,
    ListItem,
    Spinner,
    Text,
    VStack
  } from '@astryx-sv/core';

  let {
    kind,
    targetId,
    labeled = false
  }: {
    labeled?: boolean;
    kind: 'comment' | 'task';
    targetId: string;
  } = $props();
  const language = $derived(preferences.language);
  const title = $derived(kind === 'task' ? 'Historia zadania' : 'Historia komentarza');
  let open = $state(false);
  let revisions = $state<ContentRevision[]>([]);
  let nextPage = $state<number | null>(null);
  let loading = $state(false);
  let error = $state(false);
  let failedPage = $state(0);
  let controller: AbortController | undefined;

  async function load(page: number) {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading = true;
    error = false;
    failedPage = page;
    try {
      const response = await fetch(
        `/api/platform/${kind === 'task' ? 'items' : 'comments'}/${encodeURIComponent(targetId)}/revisions?page=${page}`,
        { signal: request.signal }
      );
      if (!response.ok) throw new Error('Historia niedostępna');
      const result: ContentRevisionPage = await response.json();
      if (request.signal.aborted) return;
      revisions = page === 0 ? result.revisions : [...revisions, ...result.revisions];
      nextPage = result.nextPage;
    } catch {
      if (!request.signal.aborted) error = true;
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }
  function show() {
    revisions = [];
    nextPage = null;
    open = true;
    void load(0);
  }
  function close() {
    controller?.abort();
    open = false;
  }
  onDestroy(() => controller?.abort());
  function revisionLabel(revision: ContentRevision) {
    if (revision.kind === 'created') return 'Utworzono';
    if (revision.kind === 'moved') return 'Zmieniono status';
    return 'Edytowano';
  }
</script>

{#if labeled}
  <Button variant="secondary" label={title} aria-haspopup="dialog" onclick={show}>
    {#snippet icon()}<History size={15} aria-hidden="true" />{/snippet}
  </Button>
{:else}
  <IconButton label={title} tooltip={title} variant="ghost" aria-haspopup="dialog" onclick={show}>
    {#snippet icon()}<History size={15} aria-hidden="true" />{/snippet}
  </IconButton>
{/if}

<Dialog
  isOpen={open}
  onOpenChange={(isOpen) => {
    if (!isOpen) close();
  }}
  width={920}
  maxHeight="86dvh"
  padding={0}
>
  <VStack gap={0}>
    <DialogHeader
      {title}
      subtitle="Sprawdź, co zmieniono i kto wprowadził(a) zmiany."
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    />
    <VStack gap={4} padding={5}>
      {#if revisions.length}
        <HStack gap={1.5} vAlign="center">
          <Clock3 size={13} aria-hidden="true" />
          <Text type="supporting" color="secondary">Od najnowszych</Text>
        </HStack>
        <List hasDividers>
          {#each revisions as revision, index (revision.id)}
            <ListItem>
              {#snippet startContent()}
                <Center
                  width={24}
                  height={24}
                  class={revision.kind === 'created' ? 'timeline-dot created' : 'timeline-dot'}
                >
                  {#if revision.kind === 'created'}<Plus
                      size={14}
                      aria-hidden="true"
                    />{:else if revision.kind === 'moved'}<ArrowRightLeft
                      size={13}
                      aria-hidden="true"
                    />{:else}<FilePenLine size={13} aria-hidden="true" />{/if}
                </Center>
              {/snippet}
              {#snippet label()}
                <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
                  <HStack gap={2} vAlign="center" wrap="wrap">
                    <Text as="span" weight="semibold">
                      {revision.authorName || 'Systemowy'}
                    </Text>
                    <Text as="span" type="supporting" color="secondary"
                      >{revisionLabel(revision)}</Text
                    >
                  </HStack>
                  <Text as="span" type="supporting" color="secondary">
                    <time datetime={revision.createdAt}
                      >{formatDateTime(revision.createdAt, language, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}</time
                    >
                  </Text>
                </HStack>
              {/snippet}
              {#snippet description()}
                {#if revision.changes?.length}
                  <ChangeDetails changes={revision.changes} initiallyExpanded={index === 0} />
                {:else}
                  <Text type="supporting" color="secondary">
                    {revision.changes === null
                      ? 'Dla tej starszej wersji nie zapisano szczegółów zmian.'
                      : 'Bez zmian w treści.'}
                  </Text>
                {/if}
              {/snippet}
            </ListItem>
          {/each}
        </List>
      {/if}
      {#if loading}
        <HStack gap={2} vAlign="center" justify="center" padding={5}>
          <Spinner size="sm" />
          <Text type="supporting" color="secondary" role="status">Wczytywanie historii…</Text>
        </HStack>
      {:else if error}
        <VStack gap={3}>
          <Banner status="error" title="Nie udało się wczytać historii." role="alert" />
          <Button variant="secondary" label="Spróbuj ponownie" onclick={() => load(failedPage)}>
            {#snippet icon()}<RotateCcw size={14} aria-hidden="true" />{/snippet}
          </Button>
        </VStack>
      {:else if !revisions.length}
        <EmptyState
          title="Brak zapisanych wersji"
          description="Nowe zmiany pojawią się tutaj po zapisaniu."
        >
          {#snippet icon()}<History size={28} aria-hidden="true" />{/snippet}
        </EmptyState>
      {:else if nextPage !== null}
        <Button variant="secondary" label="Pokaż starsze wersje" onclick={() => load(nextPage!)}>
          {#snippet icon()}<ArrowDown size={14} aria-hidden="true" />{/snippet}
        </Button>
      {/if}
    </VStack>
    <Divider />
    <VStack padding={4}>
      <Text type="supporting" color="secondary">
        Historia jest widoczna dla osób z dostępem do tej treści.
      </Text>
    </VStack>
  </VStack>
</Dialog>

<style>
  :global(.timeline-dot) {
    flex-shrink: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
  }
  :global(.timeline-dot.created) {
    color: var(--color-accent);
  }
</style>
