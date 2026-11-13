<script lang="ts">
  import { Info, History, Globe, Lock, GitPullRequestArrow, ArrowUpRight } from '@lucide/svelte';
  import { formatDate, formatDateTime } from 'shared/format';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { contentLocaleName } from 'shared/content-locales';
  import { docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocPerson from './DocPerson.svelte';
  import type { DocDetail } from './docs';
  import {
    Badge,
    Button,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    MetadataList,
    MetadataListItem,
    Popover,
    Section,
    StatusDot,
    Text,
    VStack
  } from '@astryx-sv/core';

  let { page, slug, publicUrl }: { page: DocDetail; slug: string | null; publicUrl: string } =
    $props();

  const language = $derived(preferences.language);
  const date = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'long', year: 'numeric' });

  const preciseDate = (value: string) =>
    formatDateTime(value, language, { dateStyle: 'full', timeStyle: 'long' });
</script>

<Popover
  label={'Szczegóły strony'}
  placement="below"
  alignment="end"
  width={340}
  role="dialog"
  isModal={false}
>
  <Button variant="ghost" size="sm" label="Szczegóły" tooltip="Szczegóły strony">
    {#snippet icon()}<Icon icon={Info} size="sm" />{/snippet}
    {#snippet endContent()}
      {#if page.access.canReview && page.pendingSuggestions}
        <StatusDot variant="accent" label="Oczekujące propozycje" />
      {/if}
    {/snippet}
  </Button>
  {#snippet content()}
    <VStack padding={3}>
      <MetadataList label={{ position: 'start' }}>
        <MetadataListItem label="Zaktualizowano">
          <VStack gap={1.5}>
            <Text type="supporting">
              <time
                datetime={page.updatedAt}
                title={preciseDate(page.updatedAt)}
                aria-label={preciseDate(page.updatedAt)}>{date(page.updatedAt)}</time
              >
            </Text>
            {#if page.updatedByUser}
              <MemberPreview
                member={page.updatedByUser}
                href={`/people/${encodeURIComponent(page.updatedByUser.id)}`}
                size={20}
              />
            {/if}
          </VStack>
        </MetadataListItem>
        <MetadataListItem label="Utworzono">
          <VStack gap={1.5}>
            <Text type="supporting">
              <time
                datetime={page.createdAt}
                title={preciseDate(page.createdAt)}
                aria-label={preciseDate(page.createdAt)}>{date(page.createdAt)}</time
              >
            </Text>
            {#if page.createdByUser}
              <MemberPreview
                member={page.createdByUser}
                href={`/people/${encodeURIComponent(page.createdByUser.id)}`}
                size={20}
              />
            {/if}
          </VStack>
        </MetadataListItem>
        <MetadataListItem label="Wersja">{page.version}</MetadataListItem>
        {#if page.folder}
          <MetadataListItem label="Folder">{page.folder.split('/').join(' / ')}</MetadataListItem>
        {/if}
        <MetadataListItem label="Języki">
          <HStack gap={1.5} wrap="wrap">
            {#each page.locales as item (item)}
              <HStack gap={1} vAlign="center">
                <Text type="supporting">{contentLocaleName(item, language)}</Text>
                {#if page.outdatedLocales.includes(item)}
                  <Text type="supporting" class="doc-info-outdated">(nieaktualna)</Text>
                {/if}
              </HStack>
            {/each}
          </HStack>
        </MetadataListItem>
        <MetadataListItem label="Widoczność">
          {#if page.public}
            <HStack gap={1} vAlign="center">
              <Icon icon={Globe} size="sm" color="success" />
              <Text type="supporting">Publiczna na stronie</Text>
            </HStack>
          {:else}
            <HStack gap={1} vAlign="center">
              <Icon icon={Lock} size="sm" color="secondary" />
              <Text type="supporting">Tylko dla członków</Text>
            </HStack>
          {/if}
        </MetadataListItem>
      </MetadataList>
    </VStack>
    {#if page.contributors.length}
      <Section variant="transparent" padding={3} dividers={['top']}>
        <VStack gap={2}>
          <Heading level={2} color="secondary" class="doc-info-heading">Autorzy</Heading>
          <List density="compact">
            {#each page.contributors as contribution (contribution.user.id)}
              <ListItem href={`/people/${encodeURIComponent(contribution.user.id)}`}>
                {#snippet label()}<DocPerson person={contribution.user} size={22} />{/snippet}
                {#snippet endContent()}
                  <HStack gap={1.5} class="doc-info-stats">
                    <Text type="supporting">{contribution.revisions}×</Text>
                    <Text type="supporting" class="added">+{contribution.additions}</Text>
                    <Text type="supporting" class="removed">−{contribution.deletions}</Text>
                  </HStack>
                {/snippet}
              </ListItem>
            {/each}
          </List>
        </VStack>
      </Section>
    {/if}
    <Section variant="transparent" padding={1.5} dividers={['top']}>
      <List density="compact" aria-label={'Szczegóły strony'}>
        <ListItem href={docsPath(slug, page.slug, 'history')} label="Historia">
          {#snippet startContent()}<Icon icon={History} size="sm" color="secondary" />{/snippet}
        </ListItem>
        {#if page.pendingSuggestions}
          <ListItem href={docsPath(slug, 'suggestions')} label="Oczekujące propozycje">
            {#snippet startContent()}
              <Icon icon={GitPullRequestArrow} size="sm" color="secondary" />
            {/snippet}
            {#snippet endContent()}
              <Badge variant="neutral" label={String(page.pendingSuggestions)} />
            {/snippet}
          </ListItem>
        {/if}
        <!-- Members read members-only pages there too, without the dashboard around them. -->
        <ListItem href={publicUrl} target="_blank" label="Zobacz na stronie">
          {#snippet startContent()}
            <Icon icon={ArrowUpRight} size="sm" color="secondary" />
          {/snippet}
        </ListItem>
      </List>
    </Section>
  {/snippet}
</Popover>

<style>
  :global(.doc-info-outdated) {
    color: var(--color-text-red);
  }
  :global(.doc-info-heading) {
    font-size: var(--font-size-sm);
    font-weight: 400;
  }
  :global(.doc-info-stats) {
    font-family: var(--font-family-code);
  }
  :global(.doc-info-stats .added) {
    color: var(--color-text-green);
    font-family: var(--font-family-code);
  }
  :global(.doc-info-stats .removed) {
    color: var(--color-text-red);
    font-family: var(--font-family-code);
  }
</style>
