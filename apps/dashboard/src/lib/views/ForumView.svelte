<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { newThreadPath, threadPath, type Workspace } from '$lib/navigation';
  import type { Thread } from '$lib/types';
  import { Plus, Archive, MessagesSquare } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    threads
  }: {
    workspace: Workspace;
    projectSlug: string;
    threads: Thread[];
  } = $props();
  const language = $derived(preferences.language);

  const archived = $derived(page.url.searchParams.get('archived') === 'true');

  function setArchived(value: boolean) {
    const query = value ? '?archived=true' : '';
    void goto(`${page.url.pathname}${query}`);
  }
</script>

<div class="workspace-header">
  <div>
    <h1>Forum</h1>
  </div>
  <div class="row">
    <a class="btn" href={newThreadPath(workspace, projectSlug)}
      ><Plus size={16} aria-hidden="true" />{'New thread'}</a
    >
    <div class="segmented-control" role="group" aria-label={'Forum view'} use:slider>
      <button
        type="button"
        class:active={!archived}
        aria-pressed={!archived}
        onclick={() => setArchived(false)}>Active</button
      >
      <button
        type="button"
        class:active={archived}
        aria-pressed={archived}
        onclick={() => setArchived(true)}
        ><Archive size={14} aria-hidden="true" />{'Archive'}</button
      >
    </div>
  </div>
</div>
{#if threads.length}
  <ul class="list-group">
    {#each threads as thread (thread.id)}
      <li>
        <a
          class="list-row"
          href={threadPath(workspace, projectSlug, thread.referenceNumber ?? thread.id)}
        >
          <MessagesSquare size={15} aria-hidden="true" />
          <span class="list-row-title">{thread.title}</span>
          {#if thread.referenceNumber}<span class="list-row-ref">#{thread.referenceNumber}</span
            >{/if}
          <span class="tag"
            >{thread.visibility === 'leaders'
              ? 'Leaders'
              : thread.visibility === 'members'
                ? 'Project members'
                : 'Association members'}</span
          >
          {#if thread.createdAt}<time class="list-row-meta" datetime={thread.createdAt}
              >{formatDate(thread.createdAt, language)}</time
            >{/if}
        </a>
      </li>
    {/each}
  </ul>
{:else}
  <p class="list-empty">No threads yet.</p>
{/if}
