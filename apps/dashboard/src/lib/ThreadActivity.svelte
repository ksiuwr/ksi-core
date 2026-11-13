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
  import { Center, HStack, Link, Text } from '@astryx-sv/core';

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

<HStack gap={3} align="start" class="thread-activity" id={`activity-${event.id}`}>
  <Center
    width={30}
    height={30}
    class={`activity-marker${kind === 'restored' ? ' restored' : ''}${kind === 'comment-removed' ? ' removed' : ''}`}
  >
    <Icon size={15} aria-hidden="true" />
  </Center>
  <Text type="body" color="secondary" as="p" class="activity-text">
    {#if event.authorId}<Link
        href={`/members/${encodeURIComponent(event.authorId)}`}
        color="primary"
        weight="semibold">{event.authorName || 'Członek stowarzyszenia'}</Link
      >{:else}<Text as="span" weight="semibold" color="primary"
        >{event.authorName || 'Systemowy'}</Text
      >{/if}
    {' '}
    {#each summaries as summary, index}
      {#if index > 0}{' '}<span class="activity-separator">·</span>
      {/if}
      {#if summary.kind === 'created'}utworzył(a) ten wątek
      {:else if summary.kind === 'archived'}zarchiwizował(a) ten wątek
      {:else if summary.kind === 'restored'}przywrócił(a) ten wątek
      {:else if summary.kind === 'comment-added'}dodał(a) komentarz
      {:else if summary.kind === 'comment-edited'}edytował(a) komentarz
      {:else if summary.kind === 'comment-removed'}usunął(a) komentarz
      {:else if summary.kind === 'access'}zmienił(a) dostęp do wątku
      {:else if summary.kind === 'visibility'}
        zmienił(a) widoczność z
        <Text as="span" weight="medium" color="primary">{visibilityName(summary.before)}</Text>
        na <Text as="span" weight="medium" color="primary">{visibilityName(summary.after)}</Text>
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
  </Text>
</HStack>

<style>
  :global(.thread-activity) {
    min-height: 50px;
  }
  :global(.activity-marker) {
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
  }
  :global(.activity-marker.restored) {
    color: var(--color-success);
  }
  :global(.activity-marker.removed) {
    color: var(--color-error);
  }
  :global(.activity-text) {
    overflow-wrap: anywhere;
  }
  time {
    margin-left: 0.25em;
    color: var(--color-text-secondary);
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    white-space: nowrap;
    font-size: var(--text-supporting-size);
  }
  .activity-separator {
    color: var(--color-text-secondary);
  }
</style>
