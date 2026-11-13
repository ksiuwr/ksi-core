<script lang="ts">
  import DocPerson from './DocPerson.svelte';
  import { GitPullRequestArrow, FilePlus, Globe, TriangleAlert } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { goto } from '$app/navigation';
  import { preferences } from '$lib/preferences.svelte';
  import type { SuggestionSummary } from './docs';
  import {
    Badge,
    EmptyState,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    SegmentedControl,
    SegmentedControlItem,
    Text,
    VStack
  } from '@astryx-sv/core';

  let {
    slug,
    workspaceName,
    suggestions,
    resolved
  }: {
    slug: string | null;
    workspaceName: string;
    suggestions: SuggestionSummary[];
    resolved: boolean;
  } = $props();

  const language = $derived(preferences.language);
  const when = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
  const state = $derived(resolved ? 'resolved' : 'pending');
</script>

<HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
  <VStack gap={1}>
    <Text type="supporting" class="workspace-eyebrow">{workspaceName}</Text>
    <Heading level={1}>Propozycje zmian</Heading>
    <Text as="p" class="workspace-description">
      Zmiany zaproponowane przez członków, czekające na porównanie i akceptację przez lidera lub
      recenzenta.
    </Text>
  </VStack>
  <SegmentedControl
    value={state}
    onChange={(next) =>
      goto(
        next === 'resolved'
          ? `${docsPath(slug, 'suggestions')}?state=resolved`
          : docsPath(slug, 'suggestions')
      )}
    label={'Stan propozycji'}
    size="sm"
  >
    <SegmentedControlItem value="pending" label="Czeka na ocenę" />
    <SegmentedControlItem value="resolved" label="Ocenione" />
  </SegmentedControl>
</HStack>
{#if suggestions.length}
  <List hasDividers class="suggestions">
    {#each suggestions as suggestion (suggestion.id)}
      <ListItem href={docsPath(slug, 'suggestions', suggestion.id)} align="start">
        {#snippet startContent()}
          <Icon
            icon={suggestion.pageId ? GitPullRequestArrow : FilePlus}
            size="md"
            color="accent"
          />
        {/snippet}
        {#snippet label()}
          <VStack gap={1.5}>
            <Text size="lg" weight="semibold" class="suggestion-title">
              {#if suggestion.pageTitle}{suggestion.pageTitle}{:else}Nowa strona: {suggestion.title}{/if}
            </Text>
            <Text type="supporting" class="suggestion-reason">{suggestion.reason}</Text>
            <HStack gap={1.5} wrap="wrap">
              {#if !suggestion.pageId}
                <Badge variant="purple" label="Nowa strona" />
              {/if}
              {#if suggestion.visibilityChange}
                <Badge
                  variant="green"
                  label={suggestion.public ? 'Upublicznienie' : 'Udostępnij tylko członkom'}
                >
                  {#snippet icon()}<Icon icon={Globe} size="xsm" />{/snippet}
                </Badge>
              {/if}
              {#if suggestion.state === 'pending' && suggestion.outdated}
                <Badge variant="warning" label="Strona zmieniła się od tego czasu">
                  {#snippet icon()}<Icon icon={TriangleAlert} size="xsm" />{/snippet}
                </Badge>
              {/if}
              {#if suggestion.state === 'accepted'}
                <Badge variant="success" label="Zaakceptowana" />
              {:else if suggestion.state === 'rejected'}
                <Badge variant="neutral" label="Odrzucona" />
              {:else if suggestion.state === 'withdrawn'}
                <Badge variant="neutral" label="Wycofana" />
              {/if}
            </HStack>
          </VStack>
        {/snippet}
        {#snippet endContent()}
          <VStack gap={1.5} hAlign="end">
            {#if suggestion.author}<DocPerson person={suggestion.author} size={22} />{/if}
            <Text type="supporting">
              <time datetime={suggestion.createdAt}>{when(suggestion.createdAt)}</time>
            </Text>
            {#if suggestion.state === 'pending'}
              <HStack gap={1.5} class="suggestion-lines">
                <Text type="supporting" class="added">+{suggestion.additions}</Text>
                <Text type="supporting" class="removed">−{suggestion.deletions}</Text>
              </HStack>
            {/if}
          </VStack>
        {/snippet}
      </ListItem>
    {/each}
  </List>
{:else}
  <EmptyState
    title={resolved ? 'Brak ocenionych propozycji' : 'Nic do oceny'}
    description={resolved ? undefined : 'Tutaj pojawią się nowe propozycje od członków.'}
    headingLevel={2}
  >
    {#snippet icon()}<Icon icon={GitPullRequestArrow} size="lg" color="secondary" />{/snippet}
  </EmptyState>
{/if}

<style>
  :global(.suggestions) {
    margin: 0;
  }
  :global(.suggestion-title) {
    overflow-wrap: anywhere;
  }
  :global(.suggestion-reason) {
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  :global(.suggestion-lines) {
    font-family: var(--font-family-code);
  }
  :global(.suggestion-lines .added) {
    color: var(--color-text-green);
    font-family: var(--font-family-code);
  }
  :global(.suggestion-lines .removed) {
    color: var(--color-text-red);
    font-family: var(--font-family-code);
  }
</style>
