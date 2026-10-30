<script lang="ts">
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { Check, Clock, UsersRound, X } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { preferences } from '$lib/preferences.svelte';
  import type { DocInsights } from './docs';

  let { insights, workspaceName }: { insights: DocInsights; workspaceName: string } = $props();

  const language = $derived(preferences.language);
  const most = $derived(Math.max(1, ...insights.contributors.map((row) => row.revisions)));
  const when = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="workspace-header">
  <div>
    <p class="workspace-eyebrow">{workspaceName}</p>
    <h1>{'Contributors'}</h1>
    <p class="workspace-description">
      {'Who keeps this documentation alive. Changes count accepted edits, including accepted suggestions.'}
    </p>
  </div>
</div>
<dl class="contributors-totals">
  <div>
    <dt>{'Pages'}</dt>
    <dd>{insights.pages}</dd>
  </div>
  <div>
    <dt>{'Changes'}</dt>
    <dd>{insights.revisions}</dd>
  </div>
  <div>
    <dt>{'Contributors'}</dt>
    <dd>{insights.contributors.length}</dd>
  </div>
</dl>
{#if insights.contributors.length}
  <div class="contributors-table">
    <table>
      <thead>
        <tr>
          <th scope="col">{'Member'}</th>
          <th scope="col">{'Changes'}</th>
          <th scope="col">{'Pages'}</th>
          <th scope="col">{'Lines'}</th>
          <th scope="col">{'Suggestions'}</th>
          <th scope="col">{'Last change'}</th>
        </tr>
      </thead>
      <tbody>
        {#each insights.contributors as row (row.user.id)}
          <tr>
            <td>
              <MemberPreview
                member={row.user}
                href={`/people/${encodeURIComponent(row.user.id)}`}
                size={28}
              />
            </td>
            <td>
              <span class="contributors-share">
                <span class="contributors-track" aria-hidden="true"
                  ><span class="contributors-bar" style:width={`${(row.revisions / most) * 100}%`}
                  ></span></span
                >
                <strong>{row.revisions}</strong>
              </span>
            </td>
            <td>{row.pages}</td>
            <td class="contributors-lines"
              ><span class="added" class:none={!row.additions}>+{row.additions}</span>
              <span class="removed" class:none={!row.deletions}>−{row.deletions}</span></td
            >
            <td>
              <!-- Flex lives inside the cell; a flex cell drops out of the table's row layout. -->
              <span class="contributors-suggestions">
                <span class:none={!row.accepted} title={'Accepted'}
                  ><Check size={12} aria-hidden="true" />{row.accepted}</span
                >
                <span class:none={!row.pending} title={'Waiting for review'}
                  ><Clock size={12} aria-hidden="true" />{row.pending}</span
                >
                <span class:none={!row.rejected} title={'Declined'}
                  ><X size={12} aria-hidden="true" />{row.rejected}</span
                >
              </span>
            </td>
            <td>
              <time datetime={row.lastContributionAt}>{when(row.lastContributionAt)}</time>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="empty-state">
    <UsersRound size={28} strokeWidth={1.4} aria-hidden="true" />
    <h2>{'No contributions yet'}</h2>
  </div>
{/if}

<style>
  .contributors-totals {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin: 0 0 24px;
  }
  .contributors-totals div {
    min-width: 140px;
    padding: 14px 18px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
  }
  .contributors-totals dt {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .contributors-totals dd {
    margin: 4px 0 0;
    font-family: var(--display);
    font-size: 26px;
    font-weight: 600;
  }
  .contributors-table {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 400;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
  .contributors-share {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
  }
  .contributors-track {
    width: 80px;
    height: 6px;
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
  }
  .contributors-bar {
    display: block;
    height: 100%;
    min-width: 4px;
    border-radius: var(--radius-sm);
    background: var(--accent);
  }
  .contributors-lines,
  .contributors-suggestions {
    font-family: var(--mono);
    font-size: 11px;
  }
  .contributors-suggestions {
    display: flex;
    gap: 12px;
    color: var(--muted);
  }
  .contributors-suggestions span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  /* Zeroes are most of this table; the numbers that matter should stand out from them. */
  .none {
    opacity: 0.5;
  }
  .added {
    color: var(--positive);
  }
  .removed {
    color: var(--danger);
  }
</style>
