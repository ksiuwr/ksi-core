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
</script>

<div class="workspace-header">
  <div>
    <p class="workspace-eyebrow">{workspaceName}</p>
    <h1>Propozycje zmian</h1>
    <p class="workspace-description">
      Zmiany zaproponowane przez członków, czekające na porównanie i akceptację przez lidera lub
      recenzenta.
    </p>
  </div>
  <div class="segmented-control" role="group" aria-label={'Stan propozycji'} use:slider>
    <button
      type="button"
      class:active={!resolved}
      aria-pressed={!resolved}
      onclick={() => goto(docsPath(slug, 'suggestions'))}>Czeka na ocenę</button
    >
    <button
      type="button"
      class:active={resolved}
      aria-pressed={resolved}
      onclick={() => goto(`${docsPath(slug, 'suggestions')}?state=resolved`)}>Ocenione</button
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
              {#if suggestion.pageTitle}{suggestion.pageTitle}{:else}Nowa strona: {suggestion.title}{/if}
            </span>
            <span class="suggestion-reason">{suggestion.reason}</span>
            <span class="suggestion-tags">
              {#if !suggestion.pageId}<span class="tag tag-lavender">Nowa strona</span>{/if}
              {#if suggestion.visibilityChange}<span class="tag tag-mint"
                  ><Globe size={11} aria-hidden="true" />
                  {#if suggestion.public}Upublicznienie{:else}Udostępnij tylko członkom{/if}</span
                >{/if}
              {#if suggestion.state === 'pending' && suggestion.outdated}<span class="tag tag-coral"
                  ><TriangleAlert size={11} aria-hidden="true" />Strona zmieniła się od tego czasu</span
                >{/if}
              {#if suggestion.state === 'accepted'}<span class="tag tag-mint">Zaakceptowana</span
                >{:else if suggestion.state === 'rejected'}<span class="tag">Odrzucona</span
                >{:else if suggestion.state === 'withdrawn'}<span class="tag">Wycofana</span>{/if}
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
      <h2>Nic do oceny</h2>
      <p>Tutaj pojawią się nowe propozycje od członków.</p>
    {:else}
      <h2>Brak ocenionych propozycji</h2>
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
    color: var(--positive);
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
