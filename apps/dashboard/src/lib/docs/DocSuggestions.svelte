<script lang="ts">
  import DocPerson from './DocPerson.svelte';
  import { GitPullRequestArrow, FilePlus, Globe, TriangleAlert } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { goto } from '$app/navigation';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences } from '$lib/preferences.svelte';
  import type { SuggestionSummary } from './docs';

  let {
    slug,
    suggestions,
    resolved
  }: { slug: string | null; suggestions: SuggestionSummary[]; resolved: boolean } = $props();

  const language = $derived(preferences.language);
  const when = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="workspace-header">
  <div>
    <h1>{'Suggestions'}</h1>
    <p class="workspace-description">
      {'Changes proposed by members, waiting for a leader or reviewer to compare and accept them.'}
    </p>
  </div>
  <div class="segmented-control" role="group" aria-label={'Suggestion state'} use:slider>
    <button
      type="button"
      class:active={!resolved}
      aria-pressed={!resolved}
      onclick={() => goto(docsPath(slug, 'suggestions'))}>{'Waiting for review'}</button
    >
    <button
      type="button"
      class:active={resolved}
      aria-pressed={resolved}
      onclick={() => goto(`${docsPath(slug, 'suggestions')}?state=resolved`)}>{'Reviewed'}</button
    >
  </div>
</div>
{#if suggestions.length}
  <ul class="suggestions">
    {#each suggestions as suggestion (suggestion.id)}
      <li>
        <a class="suggestion" href={docsPath(slug, 'suggestions', suggestion.id)}>
          <span class="suggestion-icon">
            {#if suggestion.pageId}<GitPullRequestArrow
                size={18}
                aria-hidden="true"
              />{:else}<FilePlus size={18} aria-hidden="true" />{/if}
          </span>
          <span class="suggestion-body">
            <span class="suggestion-title">
              {#if suggestion.pageTitle}{suggestion.pageTitle}{:else}{'New page'}: {suggestion.title}{/if}
            </span>
            <span class="suggestion-reason">{suggestion.reason}</span>
            <span class="suggestion-tags">
              {#if !suggestion.pageId}<span class="tag tag-lavender">{'New page'}</span>{/if}
              {#if suggestion.visibilityChange}<span class="tag tag-mint"
                  ><Globe size={11} aria-hidden="true" />
                  {#if suggestion.public}{'Make public'}{:else}{'Make members-only'}{/if}</span
                >{/if}
              {#if suggestion.state === 'pending' && suggestion.outdated}<span class="tag tag-coral"
                  ><TriangleAlert size={11} aria-hidden="true" />{'Page changed since'}</span
                >{/if}
              {#if suggestion.state === 'accepted'}<span class="tag tag-mint">{'Accepted'}</span
                >{:else if suggestion.state === 'rejected'}<span class="tag">{'Declined'}</span
                >{:else if suggestion.state === 'withdrawn'}<span class="tag">{'Withdrawn'}</span
                >{/if}
            </span>
          </span>
          <span class="suggestion-meta">
            {#if suggestion.author}<DocPerson person={suggestion.author} size={22} />{/if}
            <time datetime={suggestion.createdAt}>{when(suggestion.createdAt)}</time>
            {#if suggestion.state === 'pending'}<span class="suggestion-lines"
                ><span class="added">+{suggestion.additions}</span>
                <span class="removed">−{suggestion.deletions}</span></span
              >{/if}
          </span>
        </a>
      </li>
    {/each}
  </ul>
{:else}
  <div class="empty-state">
    <GitPullRequestArrow size={28} strokeWidth={1.4} aria-hidden="true" />
    {#if !resolved}
      <h2>{'Nothing to review'}</h2>
      <p>{'New suggestions from members will appear here.'}</p>
    {:else}
      <h2>{'No reviewed suggestions yet'}</h2>
    {/if}
  </div>
{/if}

<style>
  .suggestions {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .suggestion {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
    box-shadow: var(--shadow-xs);
  }
  .suggestion:hover {
    border-color: var(--control-border-hover);
  }
  .suggestion-icon {
    color: var(--accent);
    padding-top: 2px;
  }
  .suggestion-body {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .suggestion-title {
    font-family: var(--display);
    font-size: 16px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .suggestion-reason {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .suggestion-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .suggestion-tags .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .suggestion-meta {
    display: grid;
    justify-items: end;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }
  .suggestion-lines {
    font-family: var(--mono);
    font-size: 11px;
  }
  .added {
    color: #2f7d4a;
  }
  .removed {
    color: var(--danger);
  }
  @media (max-width: 700px) {
    .suggestion {
      grid-template-columns: auto minmax(0, 1fr);
    }
    .suggestion-meta {
      grid-column: 2;
      justify-items: start;
    }
  }
</style>
