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

<div class="task-activity" id={`activity-${event.id}`}>
  <span class="activity-marker" class:restored={kind === 'restored'}
    ><Icon size={15} aria-hidden="true" /></span
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
      {#if summary.kind === 'created'}utworzył(a) to zadanie
      {:else if summary.kind === 'archived'}zarchiwizował to zadanie
      {:else if summary.kind === 'deleted'}usunął(a) to zadanie
      {:else if summary.kind === 'restored'}przywrócił(a) to zadanie
      {:else if summary.kind === 'description'}edytował(a) opis
      {:else if summary.kind === 'deadline'}
        {#if summary.before && summary.after}
          zmienił(a) termin z
          <del class="title-value">{deadlineText(summary.before)}</del>
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
          <del class="title-value">{summary.before}</del>{/if}
        {' '}na <span class="title-value">{summary.after}</span>
      {:else if summary.kind === 'moved'}
        przeniósł(a) zadanie
        {#if summary.before}{' '}z
          <span class="status-name">{statusName(summary.before)}</span>{/if}
        {' '}do <span class="status-name">{statusName(summary.after)}</span>
      {:else if summary.kind === 'label-renamed'}
        zmienił(a) nazwę etykiety z
        <del class="title-value">{summary.before}</del>
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
  </div>
</div>

<style>
  .task-activity {
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
  .title-value,
  .status-name {
    color: var(--ink);
    font-weight: 500;
  }
  del.title-value {
    color: var(--muted);
    font-weight: 400;
  }
  .activity-label {
    display: inline;
    padding: 1px 7px;
    border-radius: 12px;
    background: var(--label-bg, color-mix(in srgb, var(--label-color) 14%, var(--surface)));
    border: 1px solid color-mix(in srgb, var(--label-color) 45%, transparent);
    color: var(--label-fg, var(--ink));
    font-weight: 500;
    font-size: 12px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
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
  .color-value {
    white-space: nowrap;
    font-size: 12px;
  }
  .color-swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1px solid var(--line);
    margin-right: 4px;
  }
  .activity-separator {
    color: var(--muted);
  }
  @media (max-width: 600px) {
    .task-activity {
      padding-left: 36px;
      font-size: 12px;
    }
    .activity-marker {
      left: -3px;
    }
  }
</style>
