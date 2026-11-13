<script lang="ts">
  import { BookOpen, ChevronDown, FileText, Lock } from '@lucide/svelte';
  import { Collapsible, HStack, Icon, List, ListItem, Text, VStack } from '@astryx-sv/core';
  import TreeLabel from '@ksi-core/ui/platform/TreeLabel.svelte';
  import { associationDocsKey } from 'shared/docs';
  import {
    publicDocPath,
    publicDocWorkspaces,
    type PublicDocFolder,
    type PublicDocSummary
  } from 'shared/public-docs';
  import { locale } from '$lib/locale.svelte';

  let { pages, workspace, slug }: { pages: PublicDocSummary[]; workspace?: string; slug?: string } =
    $props();
  const workspaces = $derived(publicDocWorkspaces(pages, locale.current));
  const current = $derived(
    pages.find((doc) => (doc.projectSlug ?? associationDocsKey) === workspace && doc.slug === slug)
  );
  let mobilePicker = $state<HTMLDetailsElement>();
  function closePicker() {
    if (mobilePicker) mobilePicker.open = false;
  }
</script>

{#snippet files(
  node: Pick<PublicDocFolder, 'folders' | 'pages'>,
  owner: string,
  depth: number,
  path: string
)}
  <VStack gap={0.5} style={`--depth:${depth}`} class="doc-nav-level">
    <List density="compact" edge="flush">
      {#each node.pages as doc (doc.slug)}
        {@const active = workspace === owner && slug === doc.slug}
        <ListItem href={publicDocPath(owner, doc.slug)} isSelected={active} onclick={closePicker}>
          {#snippet startContent()}
            <Icon icon={FileText} size="sm" color={active ? 'accent' : 'secondary'} />
          {/snippet}
          {#snippet label()}
            <TreeLabel value={doc.title} />
          {/snippet}
          {#snippet endContent()}
            {#if !doc.public}
              <Icon icon={Lock} size="xsm" label="Tylko dla członków" />
            {/if}
          {/snippet}
        </ListItem>
      {/each}
    </List>

    {#each node.folders as folder (folder.id)}
      {@const folderPath = path ? `${path} / ${folder.name}` : folder.name}
      <Collapsible trigger={folder.name} defaultIsOpen>
        {@render files(folder, owner, depth + 1, folderPath)}
      </Collapsible>
    {/each}
  </VStack>
{/snippet}

{#snippet navigation()}
  <nav aria-label="Strony dokumentacji" class="doc-nav">
    <VStack gap={2}>
      <List density="compact" edge="flush">
        <ListItem href="/docs" isSelected={!workspace} onclick={closePicker}>
          {#snippet startContent()}
            <Icon icon={BookOpen} size="sm" />
          {/snippet}
          {#snippet label()}Cała dokumentacja{/snippet}
        </ListItem>
      </List>
      <Text type="code" color="secondary" class="px-2 tracking-wider uppercase">Przestrzenie</Text>
      {#each workspaces as owner (owner.slug)}
        <Collapsible trigger={owner.name} defaultIsOpen={!workspace || workspace === owner.slug}>
          {@render files(owner, owner.slug, 1, '')}
        </Collapsible>
      {/each}
      {#if !workspaces.length}
        <Text type="supporting" color="secondary" class="px-2">Brak publicznej dokumentacji.</Text>
      {/if}
    </VStack>
  </nav>
{/snippet}

<VStack class="desktop-navigation">
  {@render navigation()}
</VStack>
<details class="mobile-navigation" bind:this={mobilePicker}>
  <summary>
    <HStack gap={2} vAlign="center" width="100%">
      <Icon icon={BookOpen} size="sm" />
      <Text as="span" class="min-w-0 flex-1 truncate">
        {current?.title ?? 'Strony dokumentacji'}
      </Text>
      <Icon icon={ChevronDown} size="sm" className="summary-chevron shrink-0" />
    </HStack>
  </summary>
  <VStack padding={2}>
    {@render navigation()}
  </VStack>
</details>

<style>
  :global(.doc-nav-level) {
    padding-inline-start: calc(var(--depth, 0) * 12px);
  }
  :global(.desktop-navigation) {
    display: block;
  }
  .mobile-navigation {
    display: none;
  }
  .mobile-navigation > summary {
    cursor: pointer;
    list-style: none;
    padding: var(--spacing-3);
    color: var(--ink);
  }
  .mobile-navigation > summary::-webkit-details-marker {
    display: none;
  }
  .mobile-navigation[open] :global(.summary-chevron) {
    rotate: 180deg;
  }
  @media (max-width: 900px) {
    :global(.desktop-navigation) {
      display: none;
    }
    .mobile-navigation {
      display: block;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
  }
</style>
