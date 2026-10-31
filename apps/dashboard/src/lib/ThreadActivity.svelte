<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime, formatRelativeTime } from 'shared/format';
  import {
    Archive,
    CircleDot,
    MessageSquare,
    Pencil,
    RotateCcw,
    Trash2,
    UserMinus,
    UserPlus,
    Users
  } from '@lucide/svelte';
  import type { ContentChange } from 'shared/activity';
  import { threadActivitySummary } from 'shared/thread-activity';
  import type { AssignmentMember } from './Assignees.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  let {
    event,
    members = [],
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
    members?: AssignmentMember[];
    now: number;
  } = $props();
  const language = $derived(preferences.language);
  const pl = $derived(language === 'pl');
  const summaries = $derived(threadActivitySummary(event.action, event.metadata.changes));
  const kind = $derived(summaries[0].kind);
  const person = (id: string): AssignmentMember =>
    members.find((member) => member.id === id) ?? {
      id,
      firstName: id,
      lastName: '',
      nickname: null,
      image: null,
      bio: null
    };
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
                  : kind === 'assignee-added'
                    ? UserPlus
                    : kind === 'assignee-removed'
                      ? UserMinus
                      : Pencil
  );
  const visibilityName = (value: string) =>
    value === 'leaders'
      ? 'liderów'
      : value === 'members'
        ? 'członków projektu'
        : 'członków stowarzyszenia';
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
  const absoluteTime = $derived(formatDateTime(event.createdAt, language));
  const relativeTime = $derived(formatRelativeTime(event.createdAt, language, now));
</script>

<div class="thread-activity" id={`activity-${event.id}`}>
  <span
    class="activity-marker"
    class:restored={kind === 'restored'}
    class:removed={kind === 'comment-removed'}><Icon size={15} aria-hidden="true" /></span
  >
  <div class="activity-text">
    {#if event.authorId}<a
        class="activity-author"
        href={`/members/${encodeURIComponent(event.authorId)}`}
        >{event.authorName || 'Członek stowarzyszenia'}</a
      >{:else}<strong class="activity-author">{event.authorName || 'Systemowy'}</strong>{/if}
    {' '}
    {#each summaries as summary, index}
      {#if index > 0}{' '}<span class="activity-separator">·</span>{' '}{/if}
      {#if summary.kind === 'created'}utworzył(a) ten wątek
      {:else if summary.kind === 'archived'}zarchiwizował(a) ten wątek
      {:else if summary.kind === 'restored'}przywrócił(a) ten wątek
      {:else if summary.kind === 'comment-added'}dodał(a) komentarz
      {:else if summary.kind === 'comment-edited'}edytował(a) komentarz
      {:else if summary.kind === 'comment-removed'}usunął(a) komentarz
      {:else if summary.kind === 'access'}zmienił(a) dostęp do wątku
      {:else if summary.kind === 'visibility'}
        zmienił(a) widoczność z
        <span class="thread-value">{visibilityName(summary.before)}</span>
        na <span class="thread-value">{visibilityName(summary.after)}</span>
      {:else if summary.kind === 'assignee-added' || summary.kind === 'assignee-removed'}
        {summary.kind === 'assignee-added' ? 'przypisał(a)' : 'usunął(a) przypisanie'}
        {' '}{#each summary.ids as id, personIndex}{#if personIndex > 0}{', '}{/if}<MemberPreview
            member={person(id)}
            href={`/members/${encodeURIComponent(id)}`}
            inline
            size={18}
          />{/each}
      {:else if summary.kind === 'invited'}
        {pl
          ? `zaprosił(a) ${summary.count} ${personPlural(summary.count)}`
          : `invited ${summary.count} ${summary.count === 1 ? 'member' : 'members'}`}
      {:else if summary.kind === 'uninvited'}
        {pl
          ? `usunął(a) ${summary.count} ${invitationPlural(summary.count)}`
          : `removed ${summary.count} ${summary.count === 1 ? 'invitation' : 'invitations'}`}
      {:else}zaktualizował(a) ten wątek{/if}
    {/each}
    {' '}<time datetime={event.createdAt} title={absoluteTime} aria-label={absoluteTime}
      >{relativeTime}</time
    >
  </div>
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
  .activity-text {
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
