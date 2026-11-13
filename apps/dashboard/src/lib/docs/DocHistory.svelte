<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import DocPerson from './DocPerson.svelte';
  import { ArrowLeft, Globe, GitPullRequestArrow, History, ChevronUp, X } from '@lucide/svelte';
  import { formatDateTime } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import {
    contentLocale,
    contentLocaleName,
    primaryContentLocale,
    type ContentLocale
  } from 'shared/content-locales';
  import { preferences } from '$lib/preferences.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import {
    docsRequest,
    errorCode,
    languagesOf,
    textIn,
    type DocDetail,
    type DocRevision,
    type DocSnapshot
  } from './docs';
  import {
    Badge,
    Button,
    Heading,
    HStack,
    Icon,
    IconButton,
    List,
    ListItem,
    SegmentedControl,
    SegmentedControlItem,
    Selector,
    Skeleton,
    Text,
    VStack
  } from '@astryx-sv/core';

  type Snapshot = DocSnapshot & { previous: DocSnapshot | null };
  let {
    projectId,
    slug,
    page,
    revisions,
    version
  }: {
    projectId: string;
    slug: string | null;
    page: DocDetail;
    revisions: DocRevision[];
    version: number | null;
  } = $props();

  let selected = $state<number | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  const uid = $props.id();
  let picker = $state<HTMLElement>();
  let open = $state(false);
  let mode = $state<'preview' | 'changes'>('preview');
  let chosenLocale = $state<ContentLocale | null>(untrack(() => page.locale));
  let loading = $state(true);
  let error = $state('');
  let request = 0;
  const language = $derived(preferences.language);
  const locales = $derived(languagesOf(snapshot, snapshot?.previous));
  const locale = $derived(
    chosenLocale && locales.includes(chosenLocale)
      ? chosenLocale
      : locales.includes(contentLocale(language))
        ? contentLocale(language)
        : primaryContentLocale
  );
  const after = $derived(textIn(snapshot, locale));
  const before = $derived(textIn(snapshot?.previous, locale));
  const previewTitle = $derived(after.title || snapshot?.title);

  async function select(next: number) {
    const current = ++request;
    selected = next;
    snapshot = null;
    loading = true;
    error = '';
    try {
      const result = await docsRequest<Snapshot>(`/docs/${page.id}/revisions/${next}`);
      if (current === request) snapshot = result;
    } catch (cause) {
      if (current === request) error = errorCode(cause);
    } finally {
      if (current === request) loading = false;
    }
  }

  onMount(() => {
    const initial = revisions.find((revision) => revision.version === version) ?? revisions[0];
    if (initial) void select(initial.version);
    else loading = false;
    return () => {
      request++;
    };
  });

  const when = (value: string) =>
    formatDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
  <VStack gap={1}>
    <Text type="supporting" class="workspace-eyebrow">Historia wersji</Text>
    <Heading level={1}>{page.displayTitle}</Heading>
  </VStack>
  <Button href={docsPath(slug, page.slug)} variant="secondary" label="Wróć do strony">
    {#snippet icon()}<Icon icon={ArrowLeft} size="sm" />{/snippet}
  </Button>
</HStack>
<DocError code={error} />
<Button
  id={`${uid}-trigger`}
  type="button"
  variant="secondary"
  label="Wersje"
  class="history-trigger"
  popovertarget={`${uid}-versions`}
  aria-expanded={open}
  aria-controls={`${uid}-versions`}
>
  {#snippet icon()}<Icon icon={History} size="sm" />{/snippet}
  {#snippet endContent()}
    {#if selected !== null}<Badge variant="neutral" label={`v${selected}`} />{/if}
    <Icon icon={ChevronUp} size="xsm" />
  {/snippet}
</Button>
<VStack class="history" gap={0}>
  <VStack as="section" gap={4} aria-live="polite">
    {#if loading}
      <VStack gap={2} aria-busy="true">
        <span class="sr-only">Wczytywanie wersji</span>
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton height={14} width="60%" />
      </VStack>
    {:else if snapshot}
      <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={2}>Wersja {snapshot.version}</Heading>
          {#if snapshot.public}
            <Badge variant="success" label="Publiczna">
              {#snippet icon()}<Icon icon={Globe} size="xsm" />{/snippet}
            </Badge>
          {/if}
        </HStack>
        <HStack gap={3} vAlign="center" wrap="wrap">
          {#if locales.length > 1}
            <Selector
              label={'Język'}
              value={locale}
              options={locales.map((option) => ({
                value: option,
                label: contentLocaleName(option, language)
              }))}
              onChange={(value: string) => (chosenLocale = value as ContentLocale)}
              variant="secondary"
              size="sm"
              isLabelHidden
              width={140}
            />
          {/if}
          <SegmentedControl
            value={mode}
            onChange={(next) => (mode = next as 'preview' | 'changes')}
            label={'Widok wersji'}
            size="sm"
          >
            <SegmentedControlItem value="changes" label="Zmiany" />
            <SegmentedControlItem value="preview" label="Cała strona" />
          </SegmentedControl>
        </HStack>
      </HStack>
      {#if mode === 'changes' && snapshot.previous && before.title !== after.title}
        <Text as="p" class="history-title-change">
          Tytuł: <del>{before.title}</del> → <ins>{after.title}</ins>
        </Text>
      {/if}
      {#if mode === 'changes' && snapshot.previous && snapshot.previous.folder !== snapshot.folder}
        <Text as="p" class="history-title-change">
          Folder: <del>{snapshot.previous.folder || '—'}</del> →
          <ins>{snapshot.folder || '—'}</ins>
        </Text>
      {/if}
      {#if mode === 'preview'}
        <VStack gap={0} class="history-preview doc-prose">
          {#if previewTitle !== page.displayTitle}
            <Heading level={1} class="history-preview-title">{previewTitle}</Heading>
          {/if}
          {#if locale !== primaryContentLocale && !after.markdown}
            <Text as="p" type="supporting" class="history-language-fallback">
              Ta wersja nie ma tłumaczenia na ten język. Wyświetlany jest tekst polski.
            </Text>
          {/if}
          <MarkdownContent value={after.markdown || snapshot.markdown} docs docLocale={locale} />
        </VStack>
      {:else}
        <DocDiff
          before={before.markdown}
          after={after.markdown}
          {projectId}
          {locale}
          beforeLabel={snapshot.previous ? `v${snapshot.previous.version}` : '—'}
          afterLabel={`v${snapshot.version}`}
        />
      {/if}
    {:else if error && selected !== null}
      <Button
        variant="secondary"
        label="Spróbuj ponownie"
        class="history-retry"
        onclick={() => selected !== null && select(selected)}
      />
    {/if}
  </VStack>
  <aside
    bind:this={picker}
    id={`${uid}-versions`}
    class="history-picker"
    popover="auto"
    aria-labelledby={`${uid}-versions-title`}
    ontoggle={(event) => (open = event.newState === 'open')}
  >
    <HStack class="history-picker-head" hAlign="between" vAlign="center" gap={3}>
      <Heading level={2} id={`${uid}-versions-title`} class="history-picker-title">
        Historia wersji
      </Heading>
      <IconButton
        label={'Zamknij'}
        tooltip={'Zamknij'}
        variant="ghost"
        size="sm"
        popovertarget={`${uid}-versions`}
        popovertargetaction="hide"
      >
        {#snippet icon()}<Icon icon={X} size="sm" />{/snippet}
      </IconButton>
    </HStack>
    <List density="compact" edge="flush" aria-label={'Wersje'}>
      {#each revisions as revision (revision.id)}
        <ListItem align="start">
          {#snippet label()}
            <a
              class="history-item"
              class:active={selected === revision.version}
              aria-current={selected === revision.version ? 'true' : undefined}
              href={docsPath(slug, page.slug, 'history', String(revision.version))}
              onclick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                picker?.hidePopover();
                document.getElementById(`${uid}-trigger`)?.focus();
                replaceState(docsPath(slug, page.slug, 'history', String(revision.version)), {});
                void select(revision.version);
              }}
            >
              <VStack gap={2}>
                <HStack gap={2} vAlign="center" wrap="wrap" class="history-item-head">
                  <Text type="code" weight="bold">v{revision.version}</Text>
                  <Text type="supporting">
                    <time datetime={revision.createdAt}>{when(revision.createdAt)}</time>
                  </Text>
                  {#if revision.version === page.version}
                    <Badge variant="success" label="Bieżąca" />
                  {/if}
                </HStack>
                <Text class="history-reason" color={revision.reason ? 'primary' : 'secondary'}>
                  {#if revision.reason}{revision.reason}{:else}Brak podsumowania{/if}
                </Text>
                <HStack hAlign="between" vAlign="center" gap={2}>
                  {#if revision.author}
                    <DocPerson person={revision.author} />
                  {/if}
                  <HStack gap={2} class="history-lines">
                    <Text type="supporting" class="added">+{revision.additions}</Text>
                    <Text type="supporting" class="removed">−{revision.deletions}</Text>
                  </HStack>
                </HStack>
                {#if revision.reviewer}
                  <HStack gap={1.5} vAlign="center" class="history-review">
                    <Icon icon={GitPullRequestArrow} size="xsm" color="secondary" />
                    <Text type="supporting">
                      Propozycję zaakceptował(a) {revision.reviewer.name}
                    </Text>
                  </HStack>
                {/if}
              </VStack>
            </a>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  </aside>
</VStack>

<style>
  :global(.history) {
    min-width: 0;
    padding-bottom: 88px;
  }
  :global(.history-trigger) {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 30;
    box-shadow: var(--shadow-med);
  }
  .history-picker {
    position: fixed;
    inset: auto 24px 78px auto;
    width: min(380px, calc(100vw - 32px));
    max-height: calc(100dvh - 112px);
    margin: 0;
    padding: 0;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-container);
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-med);
  }
  .history-item {
    display: grid;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border: 1px solid transparent;
    border-radius: var(--radius-container);
    color: var(--color-text-primary);
    font-size: var(--font-size-base);
    text-decoration: none;
  }
  .history-item:hover {
    background: var(--color-background-muted);
  }
  .history-item.active {
    background: var(--color-background-muted);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }
  .history-picker :global(.history-picker-head) {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: var(--spacing-2) var(--spacing-3);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background-surface);
  }
  :global(.history-picker-title) {
    font-size: var(--font-size-base);
    font-weight: 600;
  }
  :global(.history-item-head),
  :global(.history-lines),
  :global(.history-review) {
    font-family: var(--font-family-code);
  }
  :global(.history-reason) {
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  :global(.history-lines .added) {
    color: var(--color-text-green);
    font-family: var(--font-family-code);
  }
  :global(.history-lines .removed) {
    color: var(--color-text-red);
    font-family: var(--font-family-code);
  }
  :global(.history-retry) {
    align-self: start;
  }
  :global(.history-language-fallback) {
    margin-bottom: var(--spacing-4);
  }
  :global(.history-title-change) del {
    color: var(--color-text-red);
  }
  :global(.history-title-change) ins {
    color: var(--color-text-green);
    text-decoration: none;
  }
  :global(.history-preview) {
    max-width: 760px;
    padding-block: var(--spacing-6);
    border-top: 1px solid var(--color-border);
  }
  :global(.history-preview-title) {
    margin-bottom: var(--spacing-5);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @media (max-width: 600px) {
    :global(.history-trigger) {
      right: 16px;
      bottom: 16px;
    }
    .history-picker {
      right: 16px;
      bottom: 70px;
    }
  }
  /* With room to spare the versions are always on screen, next to what they show. */
  @media (min-width: 1280px) {
    :global(.history) {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 32px;
      align-items: start;
      padding-bottom: 0;
    }
    :global(.history-trigger),
    .history-picker :global(.history-picker-head button) {
      display: none;
    }
    .history-picker {
      position: sticky;
      inset: 24px auto auto;
      display: block;
      width: auto;
      height: auto;
      max-height: calc(100dvh - 48px);
      box-shadow: var(--shadow-low);
      /* Popovers rest hidden for their entry animation; here this one is always shown. */
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
