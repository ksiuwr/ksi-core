<script lang="ts">
  import { tick, onDestroy } from 'svelte';
  import {
    History,
    X,
    Clock3,
    ArrowDown,
    RotateCcw,
    FilePenLine,
    Plus,
    ArrowRightLeft
  } from '@lucide/svelte';
  import ChangeDetails from '@ksi-core/ui/platform/ChangeDetails.svelte';
  import type { ContentRevision, ContentRevisionPage } from 'shared/activity';

  let {
    kind,
    targetId,
    language = 'pl'
  }: {
    kind: 'comment' | 'task';
    targetId: string;
    language?: 'pl' | 'en';
  } = $props();
  const uid = $props.id();
  const pl = $derived(language === 'pl');
  const title = $derived(
    kind === 'task'
      ? pl
        ? 'Historia zadania'
        : 'Task history'
      : pl
        ? 'Historia komentarza'
        : 'Comment history'
  );
  let open = $state(false);
  let dialog = $state<HTMLDialogElement>();
  let revisions = $state<ContentRevision[]>([]);
  let nextPage = $state<number | null>(null);
  let loading = $state(false);
  let error = $state(false);
  let failedPage = $state(0);
  let controller: AbortController | undefined;

  async function load(page: number) {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    loading = true;
    error = false;
    failedPage = page;
    try {
      const response = await fetch(
        `/api/platform/${kind === 'task' ? 'items' : 'comments'}/${encodeURIComponent(targetId)}/revisions?page=${page}`,
        { signal: request.signal }
      );
      if (!response.ok) throw new Error('History unavailable');
      const result: ContentRevisionPage = await response.json();
      if (request.signal.aborted) return;
      revisions = page === 0 ? result.revisions : [...revisions, ...result.revisions];
      nextPage = result.nextPage;
    } catch {
      if (!request.signal.aborted) error = true;
    } finally {
      if (!request.signal.aborted) loading = false;
    }
  }
  async function show() {
    revisions = [];
    nextPage = null;
    open = true;
    await tick();
    dialog?.showModal();
    void load(0);
  }
  function close() {
    controller?.abort();
    dialog?.close();
    open = false;
  }
  onDestroy(() => controller?.abort());
  function label(revision: ContentRevision) {
    if (revision.kind === 'created') return pl ? 'Utworzono' : 'Created';
    if (revision.kind === 'moved') return pl ? 'Zmieniono status' : 'Status changed';
    return pl ? 'Edytowano' : 'Edited';
  }
</script>

<button
  type="button"
  class="history-trigger"
  {title}
  aria-label={title}
  aria-haspopup="dialog"
  onclick={show}
>
  <History size={15} aria-hidden="true" />
</button>

{#if open}
  <dialog
    bind:this={dialog}
    class="history-dialog"
    aria-labelledby={`${uid}-title`}
    oncancel={(event) => {
      event.preventDefault();
      close();
    }}
    onclose={() => {
      controller?.abort();
      open = false;
    }}
  >
    <header class="history-header">
      <span class="history-emblem"><History size={22} aria-hidden="true" /></span>
      <div>
        <h2 id={`${uid}-title`}>{title}</h2>
        <p>
          {pl
            ? 'Sprawdź, co zmieniono i kto wprowadził zmiany.'
            : 'See what changed and who changed it.'}
        </p>
      </div>
      <button
        type="button"
        class="close-history"
        aria-label={pl ? 'Zamknij historię' : 'Close history'}
        onclick={close}><X size={20} aria-hidden="true" /></button
      >
    </header>
    <div class="history-body" aria-busy={loading}>
      {#if revisions.length}
        <div class="timeline-label">
          <Clock3 size={13} aria-hidden="true" />{pl ? 'Od najnowszych' : 'Newest first'}
        </div>
        <ol class="revision-list">
          {#each revisions as revision, index (revision.id)}
            <li>
              <span class="timeline-dot" class:created={revision.kind === 'created'}>
                {#if revision.kind === 'created'}<Plus
                    size={14}
                    aria-hidden="true"
                  />{:else if revision.kind === 'moved'}<ArrowRightLeft
                    size={13}
                    aria-hidden="true"
                  />{:else}<FilePenLine size={13} aria-hidden="true" />{/if}
              </span>
              <article class="revision">
                <div class="revision-heading">
                  <div>
                    <strong>{revision.authorName || 'System'}</strong><span class="revision-kind"
                      >{label(revision)}</span
                    >
                  </div>
                  <time datetime={revision.createdAt}
                    >{new Date(revision.createdAt).toLocaleString(pl ? 'pl-PL' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</time
                  >
                </div>
                {#if revision.changes?.length}
                  <ChangeDetails
                    changes={revision.changes}
                    {language}
                    initiallyExpanded={index === 0}
                  />
                {:else}
                  <p class="revision-note">
                    {revision.changes === null
                      ? pl
                        ? 'Dla tej starszej wersji nie zapisano szczegółów zmian.'
                        : 'Detailed changes were not recorded for this older revision.'
                      : pl
                        ? 'Bez zmian w treści.'
                        : 'No content changes.'}
                  </p>
                {/if}
              </article>
            </li>
          {/each}
        </ol>
      {/if}
      {#if loading}
        <div class="history-loading" role="status">
          <span class="loading-dot"></span>{pl ? 'Wczytywanie historii…' : 'Loading history…'}
        </div>
      {:else if error}
        <div class="history-message" role="alert">
          <p>{pl ? 'Nie udało się wczytać historii.' : 'Could not load history.'}</p>
          <button class="history-secondary" type="button" onclick={() => load(failedPage)}
            ><RotateCcw size={14} aria-hidden="true" />{pl
              ? 'Spróbuj ponownie'
              : 'Try again'}</button
          >
        </div>
      {:else if !revisions.length}
        <div class="history-message">
          <History size={28} aria-hidden="true" />
          <h3>{pl ? 'Brak zapisanych wersji' : 'No revisions recorded'}</h3>
          <p>
            {pl
              ? 'Nowe zmiany pojawią się tutaj po zapisaniu.'
              : 'New changes will appear here when saved.'}
          </p>
        </div>
      {:else if nextPage !== null}
        <button type="button" class="history-secondary load-more" onclick={() => load(nextPage!)}
          ><ArrowDown size={14} aria-hidden="true" />{pl
            ? 'Pokaż starsze wersje'
            : 'Load older revisions'}</button
        >
      {/if}
    </div>
    <footer>
      {pl
        ? 'Historia jest widoczna dla osób z dostępem do tej treści.'
        : 'History is visible to everyone with access to this content.'}
    </footer>
  </dialog>
{/if}

<style>
  .history-trigger,
  .close-history {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    border-radius: 6px;
    width: 30px;
    height: 30px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .history-trigger:hover,
  .close-history:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  button:focus-visible {
    outline: 2px solid var(--accent, #5977a3);
    outline-offset: 2px;
  }
  .history-dialog {
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0;
    width: min(920px, calc(100vw - 32px));
    max-width: none;
    max-height: 86dvh;
    overflow: auto;
    box-shadow: 0 24px 90px #0003;
    white-space: normal;
  }
  .history-dialog::backdrop {
    background: #10182870;
    backdrop-filter: blur(4px);
  }
  .history-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 24px;
    border-bottom: 1px solid var(--line);
  }
  .history-emblem {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface-muted);
    color: var(--muted);
    flex-shrink: 0;
  }
  h2 {
    margin: 0;
    font-size: 19px;
    letter-spacing: -0.02em;
  }
  .history-header p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  .close-history {
    margin-left: auto;
    align-self: flex-start;
  }
  .history-body {
    padding: 22px 24px 24px;
    min-height: 180px;
  }
  .timeline-label {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--muted);
    font-size: 11px;
    margin-bottom: 16px;
  }
  .revision-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .revision-list li {
    position: relative;
    padding: 0 0 22px 32px;
  }
  .revision-list li::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 24px;
    bottom: 0;
    width: 1px;
    background: var(--line);
  }
  .revision-list li:last-child {
    padding-bottom: 0;
  }
  .revision-list li:last-child::before {
    display: none;
  }
  .timeline-dot {
    position: absolute;
    left: 0;
    top: 0;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    color: var(--muted);
    background: var(--surface-muted);
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .timeline-dot.created {
    color: var(--accent, #5977a3);
  }
  .revision {
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 14px;
  }
  .revision-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin-bottom: 14px;
    font-size: 12px;
  }
  .revision-heading > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .revision-kind {
    font-size: 10px;
    font-weight: 500;
    color: var(--muted);
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-muted);
  }
  time {
    color: var(--muted);
    font-size: 11px;
  }
  .revision-note {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .history-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 36px 0;
    color: var(--muted);
    font-size: 13px;
  }
  .loading-dot {
    width: 8px;
    height: 8px;
    background: var(--muted);
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite alternate;
  }
  @keyframes pulse {
    to {
      opacity: 0.3;
    }
  }
  .history-message {
    display: grid;
    justify-items: center;
    padding: 26px 10px;
    color: var(--muted);
    text-align: center;
    font-size: 13px;
  }
  .history-message h3 {
    font-size: 15px;
    margin: 12px 0 0;
    color: var(--ink);
  }
  .history-message p {
    margin: 10px 0 16px;
  }
  .history-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
  }
  .history-secondary:hover {
    background: var(--surface-muted);
  }
  .load-more {
    margin: 20px auto 0;
  }
  footer {
    padding: 13px 24px;
    border-top: 1px solid var(--line);
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 11px;
  }
  @media (max-width: 600px) {
    .history-dialog {
      width: calc(100vw - 16px);
      max-height: 92dvh;
    }
    .history-header {
      padding: 16px;
      gap: 10px;
    }
    .history-emblem {
      display: none;
    }
    .history-body {
      padding: 16px 12px;
    }
    .revision-list li {
      padding-left: 26px;
    }
    .revision {
      padding: 10px;
    }
    footer {
      padding: 12px 16px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-dot {
      animation: none;
    }
    .history-trigger,
    .close-history {
      transition: none;
    }
  }
</style>
