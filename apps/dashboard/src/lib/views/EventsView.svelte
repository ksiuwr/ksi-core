<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime } from 'shared/format';
  import ChangeDetails from '@ksi-core/ui/platform/ChangeDetails.svelte';
  import { linkForAction, linkForMetadata } from '$lib/links';
  import type { ActivityEvent } from '$lib/types';
  import {
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
  import { Activity } from '@lucide/svelte';

  const PAGE_SIZE = 30;

  let { events }: { events: ActivityEvent[] } = $props();
  const language = $derived(preferences.language);
  let shown = $state(PAGE_SIZE);
  const visible = $derived(events.slice(0, shown));
</script>

<VStack gap={4}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <Heading level={1}>Aktywność</Heading>
  </HStack>

  {#if events.length}
    <List hasDividers edge="flush">
      {#each visible as event (event.event.id)}
        {@const actionHref = linkForAction(
          event.event.action,
          event.event.targetId,
          event.projectSlug
        )}
        <ListItem align="start">
          {#snippet label()}
            <HStack hAlign="between" vAlign="start" gap={2} wrap="wrap" width="100%">
              <HStack gap={1.5} vAlign="center" wrap="wrap">
                {#if event.event.actorId}
                  <Link
                    href={`/members/${encodeURIComponent(event.event.actorId)}`}
                    type="inherit"
                    color="primary"
                    weight="semibold"
                  >
                    {event.firstName
                      ? `${event.firstName} ${event.lastName}`
                      : event.actorName || 'Systemowy'}
                  </Link>
                {:else}
                  <Text weight="semibold">Systemowy</Text>
                {/if}
                {#if actionHref}
                  <Link href={actionHref} type="inherit" color="primary" weight="medium">
                    {event.event.action}
                  </Link>
                {:else}
                  <Text type="inherit" color="secondary">{event.event.action}</Text>
                {/if}
              </HStack>
              <Text type="supporting">
                <time datetime={event.event.createdAt}
                  >{formatDateTime(event.event.createdAt, language)}</time
                >
              </Text>
            </HStack>
          {/snippet}
          {#snippet description()}
            {#if event.event.metadata && Object.keys(event.event.metadata).length > 0}
              <VStack gap={2}>
                <HStack gap={1} wrap="wrap">
                  {#each Object.entries(event.event.metadata).filter(([key]) => key !== 'changes' && !(key === 'fields' && Array.isArray(event.event.metadata?.changes))) as [key, val]}
                    {@const metaHref = linkForMetadata(key, val, event.projectSlug)}
                    {#if metaHref}
                      <Token
                        size="sm"
                        color="gray"
                        href={metaHref}
                        label={`${key}: ${String(val)}`}
                      />
                    {:else}
                      <Token size="sm" color="gray" label={`${key}: ${String(val)}`} />
                    {/if}
                  {/each}
                </HStack>
                {#if Array.isArray(event.event.metadata.changes)}
                  <ChangeDetails changes={event.event.metadata.changes} />
                {/if}
              </VStack>
            {/if}
          {/snippet}
        </ListItem>
      {/each}
    </List>

    {#if events.length > shown}
      <HStack hAlign="center">
        <Button
          variant="secondary"
          label={`Pokaż więcej · ${events.length - shown}`}
          onclick={() => (shown += PAGE_SIZE)}
        />
      </HStack>
    {/if}
  {:else}
    <EmptyState title="Brak aktywności" headingLevel={2}>
      {#snippet icon()}<Icon icon={Activity} size="lg" color="secondary" />{/snippet}
    </EmptyState>
  {/if}
</VStack>
