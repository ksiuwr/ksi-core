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
  import { contentLocaleName, type ContentLocale } from 'shared/content-locales';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences } from '$lib/preferences.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import { docsRequest, errorCode, languagesOf, textIn, type SuggestionDetail } from './docs';

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
    editing && locales.includes(editing) ? editing : (locales.find(languageChanged) ?? 'en')
  );
  const beforeText = $derived(textIn(before, locale));
  const afterText = $derived(textIn(suggestion, locale));
  const beforeLabel = $derived(
    suggestion.state === 'pending' || !suggestion.baseVersion
      ? 'Current version'
      : `v${suggestion.baseVersion}`
  );
  function languageChanged(value: ContentLocale) {
    const old = textIn(before, value);
    const next = textIn(suggestion, value);
    return old.title !== next.title || old.markdown !== next.markdown;
  }
</script>

<div class="workspace-header">
  <div>
    <p class="workspace-eyebrow">{'Suggestion'}</p>
    <h1>
      {#if suggestion.page}{suggestion.page.title}{:else}{'New page'}: {suggestion.title}{/if}
    </h1>
  </div>
  <a class="btn btn-outline" href={docsPath(slug, 'suggestions')}
    ><ArrowLeft size={15} aria-hidden="true" />{'All suggestions'}</a
  >
</div>
<DocError code={error} />
<div class="review">
  <section class="review-summary card">
    <div class="review-author">
      {#if suggestion.author}<MemberPreview
          member={suggestion.author}
          href={`/people/${encodeURIComponent(suggestion.author.id)}`}
          size={32}
        />{/if}
      <time datetime={suggestion.createdAt}>{when(suggestion.createdAt)}</time>
      {#if suggestion.state === 'pending'}<span class="tag tag-lavender"
          >{'Waiting for review'}</span
        >{:else if suggestion.state === 'accepted'}<span class="tag tag-mint">{'Accepted'}</span
        >{:else if suggestion.state === 'rejected'}<span class="tag">{'Declined'}</span>{:else}<span
          class="tag">{'Withdrawn'}</span
        >{/if}
    </div>
    <blockquote class="review-reason">{suggestion.reason}</blockquote>
    <ul class="review-notes">
      {#if !suggestion.page}
        <li>
          <FilePlus size={15} aria-hidden="true" />
          <span>{'Creates a new page at'} <code>{suggestion.slug}</code></span>
        </li>
      {/if}
      {#if (before?.folder ?? '') !== suggestion.folder}
        <li>
          <Folder size={15} aria-hidden="true" />
          <span
            >{'Folder'}:
            <del
              >{#if before?.folder}{before.folder}{:else}{'Top level'}{/if}</del
            >
            →
            <ins
              >{#if suggestion.folder}{suggestion.folder}{:else}{'Top level'}{/if}</ins
            ></span
          >
        </li>
      {/if}
      {#if visibilityChange}
        <li class="review-visibility">
          {#if suggestion.public}<Globe size={15} aria-hidden="true" /><span
              >{'Asks to publish this page on the KSI website.'}</span
            >{:else}<Lock size={15} aria-hidden="true" /><span
              >{'Asks to make this page visible to members only.'}</span
            >{/if}
        </li>
      {/if}
      {#if suggestion.state === 'pending' && suggestion.outdated && suggestion.page}
        <li class="review-warning">
          <TriangleAlert size={15} aria-hidden="true" />
          <span
            >{'The page changed after this suggestion was written'} (v{suggestion.baseVersion} → v{suggestion
              .page.version}). {'Accepting replaces the current text with the suggested one, so check the comparison below.'}</span
          >
        </li>
      {/if}
    </ul>
    {#if suggestion.state !== 'pending' && suggestion.reviewer}
      <p class="review-outcome">
        {#if suggestion.state === 'accepted'}{'Accepted by'}{:else}{'Declined by'}{/if}
        <strong>{suggestion.reviewer.name}</strong>
        {#if suggestion.reviewedAt}· <time datetime={suggestion.reviewedAt}
            >{when(suggestion.reviewedAt)}</time
          >{/if}
        {#if suggestion.reviewNote}<span class="review-note">“{suggestion.reviewNote}”</span>{/if}
      </p>
    {/if}
    {#if suggestion.state === 'accepted' && pageSlug}
      <a class="btn btn-outline review-open" href={docsPath(slug, pageSlug)}
        ><ArrowUpRight size={15} aria-hidden="true" />{'Open page'}</a
      >
    {/if}
  </section>

  <section class="review-comparison" aria-label={'Changes'}>
    {#if locales.length > 1}
      <div class="segmented-control" role="group" aria-label={'Language'} use:slider>
        {#each locales as item (item)}
          <button
            type="button"
            class:active={locale === item}
            aria-pressed={locale === item}
            onclick={() => (editing = item)}
          >
            {contentLocaleName(item, language)}
            {#if languageChanged(item)}<span class="review-language-change" title={'Changed'}
                ><span class="sr-only">{'Changed'}</span></span
              >{/if}
          </button>
        {/each}
      </div>
    {/if}
    {#if beforeText.title !== afterText.title}
      <p class="review-title-change">
        {'Title'}: <del>{beforeText.title || '—'}</del> → <ins>{afterText.title || '—'}</ins>
      </p>
    {/if}
    {#if locale !== 'en' && (!afterText.title || !afterText.markdown)}
      <p class="review-fallback">{'Empty translated fields show the English text to readers.'}</p>
    {/if}
    <DocDiff
      before={beforeText.markdown}
      after={afterText.markdown}
      {projectId}
      {locale}
      {beforeLabel}
      afterLabel={'Suggested version'}
    />
  </section>

  {#if suggestion.state === 'pending' && suggestion.access.canReview}
    <section class="review-actions card" aria-labelledby="review-heading">
      <h2 id="review-heading">{'Your review'}</h2>
      <label for="review-note">{'Note for the author (optional)'}</label>
      <textarea id="review-note" bind:value={note} rows="3" maxlength="1000"></textarea>
      {#if blockedByVisibility}
        <p class="review-warning-text">
          <TriangleAlert size={14} aria-hidden="true" />
          {'Only workspace leaders can accept a change of visibility.'}
        </p>
      {/if}
      <div class="row">
        <button
          class="btn"
          disabled={busy || blockedByVisibility}
          onclick={() => act('resolve', { accept: true, note })}
          ><Check size={15} aria-hidden="true" />{'Accept changes'}</button
        >
        <button
          class="btn btn-outline"
          disabled={busy}
          onclick={() => act('resolve', { accept: false, note })}
          ><X size={15} aria-hidden="true" />{'Decline'}</button
        >
      </div>
    </section>
  {:else if suggestion.state === 'pending' && suggestion.isAuthor}
    <div class="row">
      <button class="btn btn-outline" disabled={busy} onclick={() => act('withdraw')}
        ><Undo2 size={15} aria-hidden="true" />{'Withdraw suggestion'}</button
      >
    </div>
  {/if}
</div>

<style>
  .review {
    display: grid;
    gap: 22px;
    max-width: 1200px;
  }
  .review-summary {
    display: grid;
    gap: 14px;
  }
  .review-author {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 12px;
  }
  .review-reason {
    margin: 0;
    padding: 4px 0 4px 14px;
    border-left: 3px solid var(--accent);
    font-size: 15px;
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .review-notes {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }
  .review-notes li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .review-notes :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .review-notes del,
  .review-title-change del {
    color: var(--danger);
  }
  .review-notes ins,
  .review-title-change ins {
    color: var(--positive);
    text-decoration: none;
  }
  .review-notes code {
    font-family: var(--mono);
    font-size: 12px;
  }
  .review-visibility {
    color: var(--positive);
  }
  .review-warning {
    padding: 10px 12px;
    border-radius: var(--radius-xl);
    background: var(--coral);
  }
  .review-outcome {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  .review-note {
    flex-basis: 100%;
    color: var(--ink);
    font-style: italic;
  }
  .review-open {
    justify-self: start;
  }
  .review-comparison {
    display: grid;
    gap: 14px;
    min-width: 0;
  }
  .review-comparison > .segmented-control {
    justify-self: start;
  }
  .review-language-change {
    width: 6px;
    height: 6px;
    margin-left: 6px;
    border-radius: var(--radius-full);
    background: var(--accent);
  }
  .review-title-change,
  .review-fallback {
    margin: 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .review-fallback {
    color: var(--muted);
  }
  .review-actions {
    display: grid;
    gap: 8px;
    max-width: 640px;
  }
  .review-actions h2 {
    margin-bottom: 8px;
    font-size: 18px;
  }
  .review-warning-text {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 8px;
    color: var(--danger);
    font-size: 12px;
  }
</style>
