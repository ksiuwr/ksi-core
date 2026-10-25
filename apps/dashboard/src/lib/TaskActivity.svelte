<script lang="ts">
  import {
    CircleDot,
    Pencil,
    ArrowRightLeft,
    Tag,
    Trash2,
    RotateCcw,
    UserMinus,
    UserPlus
  } from '@lucide/svelte';
  import type { ContentChange } from 'shared/activity';
  import { taskActivitySummary } from 'shared/task-activity';
  import type { AssignmentMember } from './Assignees.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  let {
    event,
    statuses,
    labels,
    members = [],
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
    statuses: { id: string; name: string; color?: string }[];
    labels: { name: string; color?: string; description?: string }[];
    members?: AssignmentMember[];
    language: 'pl' | 'en';
    now: number;
  } = $props();
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
                  : Pencil
  );
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
  const statusName = (id: string) => statuses.find((status) => status.id === id)?.name ?? id;
  const labelInfo = (name: string) => labels.find((label) => label.name === name);
</script>

<div class="task-activity" id={`activity-${event.id}`}>
  <span class="activity-marker" class:restored={kind === 'restored'}
    ><Icon size={15} aria-hidden="true" /></span
  >
  <div class="activity-text">
    {#if event.authorId}<a
        class="activity-author"
        href={`/members/${encodeURIComponent(event.authorId)}`}
        >{event.authorName || (pl ? 'Członek stowarzyszenia' : 'Association member')}</a
      >{:else}<strong class="activity-author">{event.authorName || 'System'}</strong>{/if}
    {' '}
    {#each summaries as summary, index}
      {#if index > 0}{' '}<span class="activity-separator">·</span>{' '}{/if}
      {#if summary.kind === 'created'}{pl ? 'utworzył to zadanie' : 'created this task'}
      {:else if summary.kind === 'deleted'}{pl ? 'usunął to zadanie' : 'deleted this task'}
      {:else if summary.kind === 'restored'}{pl ? 'przywrócił to zadanie' : 'restored this task'}
      {:else if summary.kind === 'description'}{pl ? 'edytował opis' : 'edited the description'}
      {:else if summary.kind === 'renamed'}
        {pl ? 'zmienił tytuł' : 'changed the title'}
        {#if summary.before}{' '}{pl ? 'z' : 'from'}
          <del class="title-value">{summary.before}</del>{/if}
        {' '}{pl ? 'na' : 'to'} <span class="title-value">{summary.after}</span>
      {:else if summary.kind === 'moved'}
        {pl ? 'przeniósł zadanie' : 'moved this task'}
        {#if summary.before}{' '}{pl ? 'z' : 'from'}
          <span class="status-name">{statusName(summary.before)}</span>{/if}
        {' '}{pl ? 'do' : 'to'} <span class="status-name">{statusName(summary.after)}</span>
      {:else if summary.kind === 'label-renamed'}
        {pl ? 'zmienił nazwę etykiety z' : 'renamed the label from'}
        <del class="title-value">{summary.before}</del>
        {pl ? 'na' : 'to'}
        <span
          class="activity-label"
          style:--label-color={labelInfo(summary.after)?.color || '#6b7280'}>{summary.after}</span
        >
      {:else if summary.kind === 'label-color'}
        {pl ? 'zmienił kolor etykiety' : 'changed the color of the'}
        <span class="activity-label" style:--label-color={summary.after}>{summary.label}</span>
        {pl ? 'z' : 'label from'}
        <span class="color-value"
          ><span class="color-swatch" style:background={summary.before}
          ></span>{summary.before}</span
        >
        {pl ? 'na' : 'to'}
        <span class="color-value"
          ><span class="color-swatch" style:background={summary.after}></span>{summary.after}</span
        >
      {:else if summary.kind === 'label-description'}
        {pl
          ? summary.operation === 'added'
            ? 'dodał opis etykiety'
            : summary.operation === 'removed'
              ? 'usunął opis etykiety'
              : 'zmienił opis etykiety'
          : summary.operation === 'added'
            ? 'added a description to the'
            : summary.operation === 'removed'
              ? 'removed the description of the'
              : 'changed the description of the'}
        <span
          class="activity-label"
          style:--label-color={labelInfo(summary.label)?.color || '#6b7280'}>{summary.label}</span
        >{#if !pl}
          label{/if}
      {:else if summary.kind === 'assignee-added' || summary.kind === 'assignee-removed'}
        {summary.kind === 'assignee-added'
          ? pl
            ? 'przypisał'
            : 'assigned'
          : pl
            ? 'usunął przypisanie'
            : 'unassigned'}
        {' '}{#each summary.ids as id, personIndex}{#if personIndex > 0}{', '}{/if}<MemberPreview
            member={person(id)}
            href={`/members/${encodeURIComponent(id)}`}
            inline
            size={18}
            {language}
          />{/each}
      {:else if summary.kind === 'label-added' || summary.kind === 'label-removed'}
        {summary.kind === 'label-added' ? (pl ? 'dodał' : 'added') : pl ? 'usunął' : 'removed'}
        {' '}{pl
          ? summary.labels.length === 1
            ? 'etykietę'
            : 'etykiety'
          : 'the'}{' '}{#each summary.labels as name}{@const label = labelInfo(name)}<span
            class="activity-label"
            style:--label-color={label?.color || '#6b7280'}
            title={label?.description || name}>{name}</span
          >{' '}{/each}
        {#if !pl}{summary.labels.length === 1 ? 'label' : 'labels'}{/if}
      {:else}{pl ? 'zaktualizował to zadanie' : 'updated this task'}{/if}
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
    background: color-mix(in srgb, var(--label-color) 14%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--label-color) 45%, transparent);
    color: hsl(from var(--label-color) h min(100, calc(s * 1.25)) clamp(30, calc(l + 18), 65));
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
