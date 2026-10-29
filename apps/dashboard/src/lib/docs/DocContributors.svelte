<script lang="ts">
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { UsersRound } from '@lucide/svelte';
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
    <p class="contributors-eyebrow">{workspaceName}</p>
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
              ><span class="added">+{row.additions}</span>
              <span class="removed">−{row.deletions}</span></td
            >
            <td class="contributors-suggestions">
              <span title={'Accepted'}>✓ {row.accepted}</span>
              <span title={'Waiting for review'}>… {row.pending}</span>
              <span title={'Declined'}>✕ {row.rejected}</span>
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
  .contributors-eyebrow {
    margin-bottom: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
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
    gap: 10px;
    color: var(--muted);
  }
  .added {
    color: #2f7d4a;
  }
  .removed {
    color: var(--danger);
  }
</style>
