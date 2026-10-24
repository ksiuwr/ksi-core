<script lang="ts">
  import {
    Archive,
    CircleDot,
    MessageSquare,
    Pencil,
    RotateCcw,
    Trash2,
    Users
  } from '@lucide/svelte';
  import type { ContentChange } from 'shared/activity';
  import { threadActivitySummary } from 'shared/thread-activity';
  let {
    event,
    language,
    now
  }: {
    event: {
      id: string;
      action: string;
      createdAt: string;
      authorName: string | null;
      authorId: string | null;
      metadata: { changes: ContentChange[] | null };
    };
    language: 'pl' | 'en';
    now: number;
  } = $props();
  const pl = $derived(language === 'pl');
  const summaries = $derived(threadActivitySummary(event.action, event.metadata.changes));
  const kind = $derived(summaries[0].kind);
  const Icon = $derived(
    kind === 'created'
      ? CircleDot
      : kind === 'archived'
        ? Archive
        : kind === 'restored'
          ? RotateCcw
          : kind === 'comment-edited'
            ? Pencil
            : kind === 'comment-removed'
              ? Trash2
              : kind === 'comment-added'
                ? MessageSquare
                : kind === 'visibility' || kind === 'invited' || kind === 'uninvited'
                  ? Users
                  : Pencil
  );
  const visibilityName = (value: string) =>
    value === 'leaders'
      ? pl
        ? 'liderów'
        : 'leaders'
      : value === 'members'
        ? pl
          ? 'członków projektu'
          : 'project members'
        : pl
          ? 'członków stowarzyszenia'
          : 'association members';
  const personPlural = (count: number) =>
    count === 1
      ? 'osobę'
      : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14)
        ? 'osoby'
        : 'osób';
  const invitationPlural = (count: number) =>
    count === 1
      ? 'zaproszenie'
      : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14)
        ? 'zaproszenia'
        : 'zaproszeń';
  const absoluteTime = $derived(new Date(event.createdAt).toLocaleString(pl ? 'pl-PL' : 'en-GB'));
  const relativeTime = $derived.by(() => {
    const seconds = (new Date(event.createdAt).getTime() - now) / 1000;
    const abs = Math.abs(seconds);
    const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] =
      abs < 60
        ? [1, 'second']
        : abs < 3600
          ? [60, 'minute']
          : abs < 86400
            ? [3600, 'hour']
            : abs < 604800
              ? [86400, 'day']
              : abs < 2592000
                ? [604800, 'week']
                : abs < 31536000
                  ? [2592000, 'month']
                  : [31536000, 'year'];
    return new Intl.RelativeTimeFormat(pl ? 'pl' : 'en', { numeric: 'auto' }).format(
      abs < 60 ? 0 : Math.trunc(seconds / divisor),
      unit
    );
  });
</script>

<div class="thread-activity" id={`activity-${event.id}`}>
  <span
    class="activity-marker"
    class:restored={kind === 'restored'}
    class:removed={kind === 'comment-removed'}><Icon size={15} aria-hidden="true" /></span
  >
  <p>
    {#if event.authorId}<a
        class="activity-author"
        href={`/members/${encodeURIComponent(event.authorId)}`}
        >{event.authorName || (pl ? 'Członek stowarzyszenia' : 'Association member')}</a
      >{:else}<strong class="activity-author">{event.authorName || 'System'}</strong>{/if}
    {' '}
    {#each summaries as summary, index}
      {#if index > 0}{' '}<span class="activity-separator">·</span>{' '}{/if}
      {#if summary.kind === 'created'}{pl ? 'utworzył ten wątek' : 'created this thread'}
      {:else if summary.kind === 'archived'}{pl
          ? 'zarchiwizował ten wątek'
          : 'archived this thread'}
      {:else if summary.kind === 'restored'}{pl ? 'przywrócił ten wątek' : 'restored this thread'}
      {:else if summary.kind === 'comment-added'}{pl ? 'dodał komentarz' : 'added a comment'}
      {:else if summary.kind === 'comment-edited'}{pl ? 'edytował komentarz' : 'edited a comment'}
      {:else if summary.kind === 'comment-removed'}{pl ? 'usunął komentarz' : 'removed a comment'}
      {:else if summary.kind === 'access'}{pl ? 'zmienił dostęp do wątku' : 'changed thread access'}
      {:else if summary.kind === 'visibility'}
        {pl ? 'zmienił widoczność z' : 'changed visibility from'}
        <span class="thread-value">{visibilityName(summary.before)}</span>
        {pl ? 'na' : 'to'} <span class="thread-value">{visibilityName(summary.after)}</span>
      {:else if summary.kind === 'invited'}
        {pl
          ? `zaprosił ${summary.count} ${personPlural(summary.count)}`
          : `invited ${summary.count} ${summary.count === 1 ? 'member' : 'members'}`}
      {:else if summary.kind === 'uninvited'}
        {pl
          ? `usunął ${summary.count} ${invitationPlural(summary.count)}`
          : `removed ${summary.count} ${summary.count === 1 ? 'invitation' : 'invitations'}`}
      {:else}{pl ? 'zaktualizował ten wątek' : 'updated this thread'}{/if}
    {/each}
    {' '}<time datetime={event.createdAt} title={absoluteTime} aria-label={absoluteTime}
      >{relativeTime}</time
    >
  </p>
</div>

<style>
  .thread-activity {
    position: relative;
    padding: 13px 0 13px 44px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.8;
    min-height: 50px;
  }
  .activity-marker {
    position: absolute;
    top: 10px;
    left: 0;
    width: 30px;
    height: 30px;
    border: 3px solid var(--surface);
    border-radius: 50%;
    background: var(--surface-muted);
    display: grid;
    place-items: center;
    color: var(--muted);
  }
  .activity-marker.restored {
    color: var(--diff-added, #328152);
  }
  .activity-marker.removed {
    color: var(--danger, #b42318);
  }
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .activity-author {
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
    margin-right: 0.25em;
  }
  a.activity-author:hover {
    text-decoration: underline;
  }
  .thread-value {
    color: var(--ink);
    font-weight: 500;
  }
  time {
    margin-left: 0.25em;
    color: var(--muted);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 3px;
    white-space: nowrap;
    font-size: 12px;
  }
  .activity-separator {
    color: var(--muted);
  }
  @media (max-width: 600px) {
    .thread-activity {
      padding-left: 36px;
      font-size: 12px;
    }
    .activity-marker {
      left: -3px;
    }
  }
</style>
