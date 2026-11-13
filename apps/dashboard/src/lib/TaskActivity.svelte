<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime, formatRelativeTime } from 'shared/format';
  import {
    CircleDot,
    Pencil,
    ArrowRightLeft,
    Tag,
    Trash2,
    Archive,
    RotateCcw,
    UserMinus,
    UserPlus,
    CalendarClock
  } from '@lucide/svelte';
  import type { ContentChange } from 'shared/activity';
  import { taskActivitySummary } from 'shared/task-activity';
  import { labelColorStyle } from 'shared/label-colors';
  import type { AssignmentMember } from './Assignees.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { Center, HStack, Link, Text } from '@astryx-sv/core';

  let {
    event,
    statuses,
    labels,
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
    statuses: { id: string; name: string; color?: string }[];
    labels: { name: string; color?: string; description?: string }[];
    members?: AssignmentMember[];
    now: number;
  } = $props();
  const language = $derived(preferences.language);
  const pl = $derived(language === 'pl');
  const summaries = $derived(taskActivitySummary(event.action, event.metadata.changes));
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
        : kind === 'deleted'
          ? Trash2
          : kind === 'restored'
            ? RotateCcw
            : kind === 'moved'
              ? ArrowRightLeft
              : kind.startsWith('label-')
                ? Tag
                : kind === 'assignee-added'
                  ? UserPlus
                  : kind === 'assignee-removed'
                    ? UserMinus
                    : kind === 'deadline'
                      ? CalendarClock
                      : Pencil
  );
  const absoluteTime = $derived(formatDateTime(event.createdAt, language));
  const relativeTime = $derived(formatRelativeTime(event.createdAt, language, now));
  const statusName = (id: string) => statuses.find((status) => status.id === id)?.name ?? id;
  const labelInfo = (name: string) => labels.find((label) => label.name === name);
  const deadlineText = (iso: string) =>
    formatDateTime(iso, language, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<HStack gap={3} align="start" class="task-activity" id={`activity-${event.id}`}>
  <Center
    width={30}
    height={30}
    class={kind === 'restored' ? 'activity-marker restored' : 'activity-marker'}
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
      {#if summary.kind === 'created'}utworzył(a) to zadanie
      {:else if summary.kind === 'archived'}zarchiwizował to zadanie
      {:else if summary.kind === 'deleted'}usunął(a) to zadanie
      {:else if summary.kind === 'restored'}przywrócił(a) to zadanie
      {:else if summary.kind === 'description'}edytował(a) opis
      {:else if summary.kind === 'deadline'}
        {#if summary.before && summary.after}
          zmienił(a) termin z
          <Text as="span" hasStrikethrough color="secondary">{deadlineText(summary.before)}</Text>
          {' '}na
          <time class="title-value" datetime={summary.after}>{deadlineText(summary.after)}</time>
        {:else if summary.after}
          ustawił termin na
          <time class="title-value" datetime={summary.after}>{deadlineText(summary.after)}</time>
        {:else}
          usunął(a) termin
        {/if}
      {:else if summary.kind === 'renamed'}
        zmienił(a) tytuł
        {#if summary.before}{' '}z
          <Text as="span" hasStrikethrough color="secondary">{summary.before}</Text>{/if}
        {' '}na <Text as="span" weight="medium" color="primary">{summary.after}</Text>
      {:else if summary.kind === 'moved'}
        przeniósł(a) zadanie
        {#if summary.before}{' '}z
          <Text as="span" weight="medium" color="primary">{statusName(summary.before)}</Text>{/if}
        {' '}do <Text as="span" weight="medium" color="primary">{statusName(summary.after)}</Text>
      {:else if summary.kind === 'label-renamed'}
        zmienił(a) nazwę etykiety z
        <Text as="span" hasStrikethrough color="secondary">{summary.before}</Text>
        na
        <span class="activity-label" style={labelColorStyle(labelInfo(summary.after)?.color)}
          >{summary.after}</span
        >
      {:else if summary.kind === 'label-color'}
        zmienił(a) kolor etykiety
        <span class="activity-label" style={labelColorStyle(summary.after)}>{summary.label}</span>
        z
        <span class="color-value"
          ><span class="color-swatch" style:background={summary.before}
          ></span>{summary.before}</span
        >
        na
        <span class="color-value"
          ><span class="color-swatch" style:background={summary.after}></span>{summary.after}</span
        >
      {:else if summary.kind === 'label-description'}
        {pl
          ? summary.operation === 'added'
            ? 'dodał(a) opis etykiety'
            : summary.operation === 'removed'
              ? 'usunął(a) opis etykiety'
              : 'zmienił(a) opis etykiety'
          : summary.operation === 'added'
            ? 'added a description to the'
            : summary.operation === 'removed'
              ? 'removed the description of the'
              : 'changed the description of the'}
        <span class="activity-label" style={labelColorStyle(labelInfo(summary.label)?.color)}
          >{summary.label}</span
        >{#if !pl}
          etykieta{/if}
      {:else if summary.kind === 'assignee-added' || summary.kind === 'assignee-removed'}
        {summary.kind === 'assignee-added' ? 'przypisał(a)' : 'usunął(a) przypisanie'}
        {' '}{#each summary.ids as id, personIndex}{#if personIndex > 0}{', '}{/if}<MemberPreview
            member={person(id)}
            href={`/members/${encodeURIComponent(id)}`}
            inline
            size={18}
          />{/each}
      {:else if summary.kind === 'label-added' || summary.kind === 'label-removed'}
        {summary.kind === 'label-added' ? 'dodał(a)' : 'usunął(a)'}
        {' '}{pl
          ? summary.labels.length === 1
            ? 'etykietę'
            : 'etykiety'
          : 'the'}{' '}{#each summary.labels as name}{@const label = labelInfo(name)}<span
            class="activity-label"
            style={labelColorStyle(label?.color)}
            title={label?.description || name}>{name}</span
          >{' '}{/each}
        {#if !pl}{summary.labels.length === 1 ? 'etykieta' : 'labels'}{/if}
      {:else}zaktualizował(a) to zadanie{/if}
    {/each}
    {' '}<time datetime={event.createdAt} title={absoluteTime} aria-label={absoluteTime}
      >{relativeTime}</time
    >
  </Text>
</HStack>

<style>
  :global(.task-activity) {
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
  :global(.activity-text) {
    overflow-wrap: anywhere;
  }
  .activity-label {
    display: inline;
    padding: 1px 7px;
    border: 1px solid color-mix(in srgb, var(--label-color) 45%, transparent);
    border-radius: var(--radius-full);
    background: var(--label-bg);
    color: var(--label-fg);
    font-weight: var(--font-weight-medium);
    font-size: var(--text-supporting-size);
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  time {
    margin-left: 0.25em;
    color: var(--color-text-secondary);
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    white-space: nowrap;
    font-size: var(--text-supporting-size);
  }
  .title-value {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
  .color-value {
    white-space: nowrap;
    font-size: var(--text-supporting-size);
  }
  .color-swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    margin-right: 4px;
  }
  .activity-separator {
    color: var(--color-text-secondary);
  }
</style>
