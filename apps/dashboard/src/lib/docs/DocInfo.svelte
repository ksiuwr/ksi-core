<script lang="ts">
  import { tick } from 'svelte';
  import { Info, History, Globe, Lock, GitPullRequestArrow, ArrowUpRight } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocPerson from './DocPerson.svelte';
  import type { DocDetail } from './docs';

  let { page, slug, publicUrl }: { page: DocDetail; slug: string | null; publicUrl: string } =
    $props();

  const uid = $props.id();
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLDivElement>();
  let open = $state(false);
  let position = $state({ top: 0, left: 0, width: 340 });
  const language = $derived(preferences.language);
  const date = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'long', year: 'numeric' });

  // Anchored under the button, or above it when the screen has no room below.
  function place() {
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const height = panel.offsetHeight;
    const below = window.innerHeight - rect.bottom - 12;
    position = {
      width,
      left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      top: below >= height || rect.top < height ? rect.bottom + 6 : rect.top - height - 6
    };
  }

  $effect(() => {
    if (!open) return;
    void tick().then(place);
    window.addEventListener('scroll', place, { capture: true, passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
    };
  });
</script>

<button
  bind:this={trigger}
  type="button"
  class="btn ghost btn-sm doc-info-trigger"
  popovertarget={`${uid}-panel`}
  aria-expanded={open}
  title={'Page details'}
>
  <Info aria-hidden="true" />{'Details'}{#if page.access.canReview && page.pendingSuggestions}<span
      class="doc-info-dot"
      aria-hidden="true"
    ></span>{/if}
</button>
<div
  bind:this={panel}
  id={`${uid}-panel`}
  class="doc-info"
  popover="auto"
  role="dialog"
  aria-label={'Page details'}
  style:top={`${position.top}px`}
  style:left={`${position.left}px`}
  style:width={`${position.width}px`}
  ontoggle={(event) => (open = event.newState === 'open')}
>
  <dl>
    <div>
      <dt>{'Updated'}</dt>
      <dd>
        <time datetime={page.updatedAt}>{date(page.updatedAt)}</time>
        {#if page.updatedByUser}<span class="muted">· {page.updatedByUser.name}</span>{/if}
      </dd>
    </div>
    <div>
      <dt>{'Created'}</dt>
      <dd>
        <time datetime={page.createdAt}>{date(page.createdAt)}</time>
        {#if page.createdByUser}<span class="muted">· {page.createdByUser.name}</span>{/if}
      </dd>
    </div>
    <div>
      <dt>{'Version'}</dt>
      <dd>{page.version}</dd>
    </div>
    <div>
      <dt>{'Visibility'}</dt>
      <dd>
        {#if page.public}<span class="doc-info-visibility public"
            ><Globe size={13} aria-hidden="true" />{'Public on the website'}</span
          >{:else}<span class="doc-info-visibility"
            ><Lock size={13} aria-hidden="true" />{'Members only'}</span
          >{/if}
      </dd>
    </div>
  </dl>
  {#if page.contributors.length}
    <section aria-labelledby={`${uid}-contributors`}>
      <h2 id={`${uid}-contributors`}>{'Contributors'}</h2>
      <ul>
        {#each page.contributors as contribution (contribution.user.id)}
          <li>
            <a href={`/people/${encodeURIComponent(contribution.user.id)}`}
              ><DocPerson person={contribution.user} size={22} /></a
            >
            <span class="doc-info-stats" title={'Changes'}>
              {contribution.revisions}×
              <span class="added">+{contribution.additions}</span>
              <span class="removed">−{contribution.deletions}</span>
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  <nav class="doc-info-links" aria-label={'Page details'}>
    <a href={docsPath(slug, page.slug, 'history')}
      ><History size={14} aria-hidden="true" />{'History'}</a
    >
    {#if page.pendingSuggestions}
      <a href={docsPath(slug, 'suggestions')}
        ><GitPullRequestArrow size={14} aria-hidden="true" />{'Pending suggestions'}: {page.pendingSuggestions}</a
      >
    {/if}
    {#if page.public}
      <a href={publicUrl} target="_blank" rel="noopener noreferrer"
        ><ArrowUpRight size={14} aria-hidden="true" />{'View on website'}</a
      >
    {/if}
  </nav>
</div>

<style>
  .doc-info-trigger {
    position: relative;
    color: var(--muted);
  }
  .doc-info-trigger:hover,
  .doc-info-trigger[aria-expanded='true'] {
    color: var(--ink);
    background: var(--surface-muted);
  }
  /* Tells reviewers that suggestions for this page are waiting. */
  .doc-info-dot {
    position: absolute;
    top: 3px;
    right: 2px;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--primary);
  }
  .doc-info {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-md);
    font-size: 13px;
  }
  dl {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 14px 16px;
  }
  dl div {
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 10px;
  }
  dt {
    color: var(--muted);
    font-size: 12px;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .doc-info-visibility {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .doc-info-visibility.public {
    color: #2f7d4a;
  }
  section {
    padding: 12px 16px;
    border-top: 1px solid var(--line);
  }
  h2 {
    margin: 0 0 8px;
    color: var(--muted);
    font-family: var(--font);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
  }
  ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  li a {
    min-width: 0;
    color: var(--ink);
    text-decoration: none;
  }
  li a:hover {
    text-decoration: underline;
  }
  .doc-info-stats {
    flex-shrink: 0;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }
  .added {
    color: #2f7d4a;
  }
  .removed {
    color: var(--danger);
  }
  .doc-info-links {
    display: grid;
    padding: 6px;
    border-top: 1px solid var(--line);
  }
  .doc-info-links a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: var(--radius-md);
    color: var(--ink);
    text-decoration: none;
  }
  .doc-info-links a:hover {
    background: var(--surface-muted);
  }
  .doc-info-links :global(svg) {
    color: var(--muted);
  }
</style>
