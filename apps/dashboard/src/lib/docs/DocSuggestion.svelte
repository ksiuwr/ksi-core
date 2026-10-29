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
    FilePlus
  } from '@lucide/svelte';
  import { formatDateTime } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import { docsRequest, errorCode, type SuggestionDetail } from './docs';

  let {
    projectId,
    slug,
    suggestion
  }: { projectId: string; slug: string | null; suggestion: SuggestionDetail } = $props();

  let note = $state('');
  let busy = $state(false);
  let error = $state('');
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
</script>

<div class="workspace-header">
  <div>
    <p class="suggestion-eyebrow">{'Suggestion'}</p>
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
      {:else if suggestion.page.title !== suggestion.title}
        <li>
          <span>{'Title'}: <del>{suggestion.page.title}</del> → <ins>{suggestion.title}</ins></span>
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

  {#if suggestion.state === 'pending' || !suggestion.baseVersion}
    <DocDiff
      before={suggestion.state === 'pending' ? (suggestion.page?.markdown ?? '') : ''}
      after={suggestion.markdown}
      {projectId}
      beforeLabel={'Current version'}
      afterLabel={'Suggested version'}
    />
  {:else}
    <DocDiff
      before={suggestion.baseMarkdown ?? ''}
      after={suggestion.markdown}
      {projectId}
      beforeLabel={`v${suggestion.baseVersion}`}
      afterLabel={'Suggested version'}
    />
  {/if}

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
  .suggestion-eyebrow {
    margin-bottom: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
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
  .review-notes del {
    color: var(--danger);
  }
  .review-notes ins {
    color: #2f7d4a;
    text-decoration: none;
  }
  .review-notes code {
    font-family: var(--mono);
    font-size: 12px;
  }
  .review-visibility {
    color: #2f7d4a;
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
