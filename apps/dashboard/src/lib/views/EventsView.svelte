<script lang="ts">
  import ChangeDetails from '@ksi-core/ui/platform/ChangeDetails.svelte';
  import { linkForAction, linkForMetadata } from '$lib/links';
  import type { ActivityEvent } from '$lib/types';

  let { events, language }: { events: ActivityEvent[]; language: 'pl' | 'en' } = $props();
</script>

<div class="workspace-header">
  <div>
    <h1>{'Activity'}</h1>
  </div>
</div>
{#each events as event (event.event.id)}
  <div class="event-item">
    <div class="event-meta">
      <div>
        <strong
          >{#if event.event.actorId}<a href={`/members/${encodeURIComponent(event.event.actorId)}`}
              >{event.firstName
                ? `${event.firstName} ${event.lastName}`
                : event.actorName || 'System'}</a
            >{:else}{'System'}{/if}</strong
        >
        {#if linkForAction(event.event.action, event.event.targetId, event.projectSlug)}
          <a
            class="action-link"
            href={linkForAction(event.event.action, event.event.targetId, event.projectSlug)}
            >{event.event.action}</a
          >
        {:else}
          <span class="muted">{event.event.action}</span>
        {/if}
      </div>
      {#if event.event.metadata && Object.keys(event.event.metadata).length > 0}
        <div class="event-metadata">
          {#each Object.entries(event.event.metadata).filter(([key]) => key !== 'changes' && !(key === 'fields' && Array.isArray(event.event.metadata?.changes))) as [key, val]}
            {#if linkForMetadata(key, val, event.projectSlug)}
              <a class="meta-tag meta-link" href={linkForMetadata(key, val, event.projectSlug)}
                >{key}: {String(val)}</a
              >
            {:else}
              <span class="meta-tag">{key}: {String(val)}</span>
            {/if}
          {/each}
        </div>
        {#if Array.isArray(event.event.metadata.changes)}<ChangeDetails
            changes={event.event.metadata.changes}
            {language}
          />{/if}
      {/if}
    </div>
    <time class="muted" datetime={event.event.createdAt}
      >{new Date(event.event.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-GB')}</time
    >
  </div>
{/each}
{#if !events.length}
  <p class="muted" style="margin-top: 20px;">{'No activity yet.'}</p>
{/if}

<style>
  .event-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .event-meta {
    flex: 1 1 480px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    font-size: 13px;
    gap: 4px;
  }
  .event-metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .meta-tag {
    font-size: 11px;
    padding: 2px 6px;
    background: var(--surface-muted);
    border-radius: 4px;
    color: var(--muted);
  }
  .meta-link {
    color: var(--accent);
    text-decoration: none;
  }
  .meta-link:hover {
    text-decoration: underline;
  }
  .action-link {
    color: var(--ink);
    text-decoration: none;
    font-weight: 500;
  }
  .action-link:hover {
    text-decoration: underline;
  }
</style>
