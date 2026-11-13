<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    Globe,
    Lock,
    TriangleAlert,
    Undo2,
    X,
    FilePlus,
    Folder
  } from '@lucide/svelte';
  import { formatDateTime } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import {
    contentLocaleName,
    primaryContentLocale,
    type ContentLocale
  } from 'shared/content-locales';
  import { preferences } from '$lib/preferences.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import { docsRequest, errorCode, languagesOf, textIn, type SuggestionDetail } from './docs';
  import {
    Badge,
    Banner,
    Button,
    Card,
    Heading,
    HStack,
    Icon,
    SegmentedControl,
    SegmentedControlItem,
    Text,
    TextArea,
    VStack
  } from '@astryx-sv/core';

  let {
    projectId,
    slug,
    suggestion
  }: { projectId: string; slug: string | null; suggestion: SuggestionDetail } = $props();

  let note = $state('');
  let busy = $state(false);
  let error = $state('');
  let editing = $state<ContentLocale | null>(null);
  const language = $derived(preferences.language);

  async function act(path: string, body?: unknown) {
    busy = true;
    error = '';
    try {
      await docsRequest(
        `/docs/proposals/${encodeURIComponent(suggestion.id)}/${path}`,
        'POST',
        body
      );
      await invalidateAll();
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }

  const visibilityChange = $derived(suggestion.public !== (suggestion.page?.public ?? false));
  const blockedByVisibility = $derived(visibilityChange && !suggestion.access.canPublish);
  const when = (value: string) =>
    formatDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' });
  const pageSlug = $derived(suggestion.page?.slug ?? suggestion.slug ?? '');
  // Pending reviews compare with what accepting would replace; resolved reviews
  // keep comparing against the immutable version the author started from.
  const before = $derived(suggestion.state === 'pending' ? suggestion.page : suggestion.base);
  const locales = $derived(languagesOf(before, suggestion));
  const locale = $derived(
    editing && locales.includes(editing)
      ? editing
      : (locales.find(languageChanged) ?? primaryContentLocale)
  );
  const beforeText = $derived(textIn(before, locale));
  const afterText = $derived(textIn(suggestion, locale));
  const beforeLabel = $derived(
    suggestion.state === 'pending' || !suggestion.baseVersion
      ? 'Obecna wersja'
      : `v${suggestion.baseVersion}`
  );
  function languageChanged(value: ContentLocale) {
    const old = textIn(before, value);
    const next = textIn(suggestion, value);
    return old.title !== next.title || old.markdown !== next.markdown;
  }
</script>

<HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
  <VStack gap={1}>
    <Text type="supporting" class="workspace-eyebrow">Propozycja</Text>
    <Heading level={1}>
      {#if suggestion.page}{suggestion.page.title}{:else}Nowa strona: {suggestion.title}{/if}
    </Heading>
  </VStack>
  <Button href={docsPath(slug, 'suggestions')} variant="secondary" label="Wszystkie propozycje">
    {#snippet icon()}<Icon icon={ArrowLeft} size="sm" />{/snippet}
  </Button>
</HStack>
<DocError code={error} />
<VStack class="review" gap={5}>
  <Card padding={6}>
    <VStack gap={3}>
      <HStack class="review-author" gap={3} vAlign="center" wrap="wrap">
        {#if suggestion.author}
          <MemberPreview
            member={suggestion.author}
            href={`/people/${encodeURIComponent(suggestion.author.id)}`}
            size={32}
          />
        {/if}
        <Text type="supporting">
          <time datetime={suggestion.createdAt}>{when(suggestion.createdAt)}</time>
        </Text>
        {#if suggestion.state === 'pending'}
          <Badge variant="warning" label="Czeka na ocenę" />
        {:else if suggestion.state === 'accepted'}
          <Badge variant="success" label="Zaakceptowana" />
        {:else if suggestion.state === 'rejected'}
          <Badge variant="neutral" label="Odrzucona" />
        {:else}
          <Badge variant="neutral" label="Wycofana" />
        {/if}
      </HStack>
      <blockquote class="review-reason">{suggestion.reason}</blockquote>
      <VStack gap={2} class="review-notes">
        {#if !suggestion.page}
          <HStack gap={2} vAlign="start">
            <Icon icon={FilePlus} size="sm" color="secondary" />
            <Text type="supporting">
              Tworzy nową stronę pod adresem <code>{suggestion.slug}</code>
            </Text>
          </HStack>
        {/if}
        {#if (before?.folder ?? '') !== suggestion.folder}
          <HStack gap={2} vAlign="start">
            <Icon icon={Folder} size="sm" color="secondary" />
            <Text type="supporting">
              Folder:
              <del
                >{#if before?.folder}{before.folder}{:else}Najwyższy poziom{/if}</del
              >
              →
              <ins
                >{#if suggestion.folder}{suggestion.folder}{:else}Najwyższy poziom{/if}</ins
              >
            </Text>
          </HStack>
        {/if}
        {#if visibilityChange}
          <HStack gap={2} vAlign="start" class="review-visibility">
            {#if suggestion.public}
              <Icon icon={Globe} size="sm" color="success" />
              <Text type="supporting">Prosi o publikację tej strony na stronie KSI.</Text>
            {:else}
              <Icon icon={Lock} size="sm" color="secondary" />
              <Text type="supporting">Prosi o ograniczenie widoczności strony do członków.</Text>
            {/if}
          </HStack>
        {/if}
        {#if suggestion.state === 'pending' && suggestion.outdated && suggestion.page}
          <Banner
            status="warning"
            container="section"
            title={`Strona zmieniła się po napisaniu tej propozycji (v${suggestion.baseVersion} → v${suggestion.page.version}). Akceptacja zastąpi obecną treść proponowaną, więc sprawdź porównanie poniżej.`}
          />
        {/if}
      </VStack>
      {#if suggestion.state !== 'pending' && suggestion.reviewer}
        <Text as="p" type="supporting" class="review-outcome">
          {#if suggestion.state === 'accepted'}Zaakceptował(a){:else}Odrzucił(a){/if}
          <strong>{suggestion.reviewer.name}</strong>
          {#if suggestion.reviewedAt}· <time datetime={suggestion.reviewedAt}
              >{when(suggestion.reviewedAt)}</time
            >{/if}
          {#if suggestion.reviewNote}<span class="review-note">“{suggestion.reviewNote}”</span>{/if}
        </Text>
      {/if}
      {#if suggestion.state === 'accepted' && pageSlug}
        <Button
          href={docsPath(slug, pageSlug)}
          variant="secondary"
          label="Otwórz stronę"
          class="review-open"
        >
          {#snippet icon()}<Icon icon={ArrowUpRight} size="sm" />{/snippet}
        </Button>
      {/if}
    </VStack>
  </Card>

  <VStack as="section" gap={3} aria-label={'Zmiany'}>
    {#if locales.length > 1}
      <HStack hAlign="start">
        <SegmentedControl
          value={locale}
          onChange={(next) => (editing = next as ContentLocale)}
          label={'Język'}
          size="sm"
        >
          {#each locales as item (item)}
            <SegmentedControlItem value={item} label={contentLocaleName(item, language)}>
              {#snippet icon()}
                {#if languageChanged(item)}
                  <span class="review-language-change" aria-hidden="true"></span>
                {/if}
              {/snippet}
            </SegmentedControlItem>
          {/each}
        </SegmentedControl>
      </HStack>
    {/if}
    {#if beforeText.title !== afterText.title}
      <Text as="p" class="review-title-change">
        Tytuł: <del>{beforeText.title || '—'}</del> → <ins>{afterText.title || '—'}</ins>
      </Text>
    {/if}
    {#if locale !== primaryContentLocale && (!afterText.title || !afterText.markdown)}
      <Text as="p" type="supporting" class="review-fallback">
        Puste pola tłumaczenia są zastępowane tekstem polskim.
      </Text>
    {/if}
    <DocDiff
      before={beforeText.markdown}
      after={afterText.markdown}
      {projectId}
      {locale}
      {beforeLabel}
      afterLabel={'Proponowana wersja'}
    />
  </VStack>

  {#if suggestion.state === 'pending' && suggestion.access.canReview}
    <Card padding={6} class="review-actions" aria-labelledby="review-heading">
      <VStack gap={2}>
        <Heading level={2} id="review-heading" class="review-heading">Twoja ocena</Heading>
        <TextArea
          id="review-note"
          label="Uwaga dla autora (opcjonalnie)"
          value={note}
          rows={3}
          maxLength={1000}
          onChange={(next) => (note = next)}
        />
        {#if blockedByVisibility}
          <HStack gap={1.5} vAlign="center" class="review-warning-text">
            <Icon icon={TriangleAlert} size="sm" color="error" />
            <Text type="supporting"
              >Tylko liderzy przestrzeni mogą zaakceptować zmianę widoczności.</Text
            >
          </HStack>
        {/if}
        <HStack gap={2} wrap="wrap">
          <Button
            label="Akceptuj zmiany"
            isDisabled={busy || blockedByVisibility}
            onclick={() => act('resolve', { accept: true, note })}
          >
            {#snippet icon()}<Icon icon={Check} size="sm" />{/snippet}
          </Button>
          <Button
            variant="secondary"
            label="Odrzuć"
            isDisabled={busy}
            onclick={() => act('resolve', { accept: false, note })}
          >
            {#snippet icon()}<Icon icon={X} size="sm" />{/snippet}
          </Button>
        </HStack>
      </VStack>
    </Card>
  {:else if suggestion.state === 'pending' && suggestion.isAuthor}
    <HStack>
      <Button
        variant="secondary"
        label="Wycofaj propozycję"
        isDisabled={busy}
        onclick={() => act('withdraw')}
      >
        {#snippet icon()}<Icon icon={Undo2} size="sm" />{/snippet}
      </Button>
    </HStack>
  {/if}
</VStack>

<style>
  :global(.review) {
    max-width: 1200px;
  }
  :global(.review-author) {
    color: var(--color-text-secondary);
  }
  .review-reason {
    margin: 0;
    padding: var(--spacing-1) 0 var(--spacing-1) var(--spacing-3);
    border-left: 3px solid var(--color-accent);
    font-size: var(--font-size-lg);
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :global(.review-notes) {
    font-size: var(--font-size-base);
  }
  :global(.review-notes) del,
  :global(.review-title-change) del {
    color: var(--color-text-red);
  }
  :global(.review-notes) ins,
  :global(.review-title-change) ins {
    color: var(--color-text-green);
    text-decoration: none;
  }
  :global(.review-notes) code {
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
  }
  :global(.review-visibility) {
    color: var(--color-text-green);
  }
  :global(.review-outcome) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1-5);
    margin: 0;
  }
  .review-note {
    flex-basis: 100%;
    color: var(--color-text-primary);
    font-style: italic;
  }
  :global(.review-open) {
    justify-self: start;
    align-self: start;
  }
  .review-language-change {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-accent);
  }
  :global(.review-title-change),
  :global(.review-fallback) {
    margin: 0;
    font-size: var(--font-size-base);
    overflow-wrap: anywhere;
  }
  :global(.review-warning-text) {
    color: var(--color-text-red);
  }
  :global(.review-actions) {
    max-width: 640px;
  }
  :global(.review-heading) {
    font-size: var(--font-size-lg);
  }
</style>
