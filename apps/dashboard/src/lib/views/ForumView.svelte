<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Assignees from '$lib/Assignees.svelte';
  import { api, errorMessage } from '$lib/api';
  import { threadPath, type Workspace } from '$lib/navigation';
  import type { Thread } from '$lib/types';
  import { Plus, Archive } from '@lucide/svelte';
  import { untrack } from 'svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    threads,
    language,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    threads: Thread[];
    language: 'pl' | 'en';
    refresh: () => Promise<void>;
  } = $props();

  let composer = $state(false);
  let title = $state('');
  let markdown = $state('');
  let visibility = $state(untrack(() => (projectId ? 'members' : 'association')));
  let assignees = $state<string[]>([]);
  let busy = $state(false);
  let error = $state('');
  const archived = $derived(page.url.searchParams.get('archived') === 'true');

  function setArchived(value: boolean) {
    const query = value ? '?archived=true' : '';
    void goto(`${page.url.pathname}${query}`);
  }

  async function create() {
    if (busy || !title.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Thread>('/platform/threads', 'POST', {
        assigneeIds: assignees,
        title,
        markdown,
        visibility,
        invitedIds: [],
        ...(projectId ? { projectId } : {})
      });
      composer = false;
      await goto(threadPath(workspace, projectSlug, result.id));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <div>
    <h1>Forum</h1>
  </div>
  <div class="row">
    <button
      class="btn"
      disabled={busy}
      onclick={() => {
        title = '';
        markdown = '';
        assignees = [];
        composer = true;
      }}><Plus size={16} aria-hidden="true" />{'New thread'}</button
    >
    <div class="segmented-control" role="group" aria-label={'Forum view'}>
      <button
        type="button"
        class:active={!archived}
        aria-pressed={!archived}
        onclick={() => setArchived(false)}>{'Active'}</button
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
{#if error}<p class="error" role="alert">{error}</p>{/if}

{#each threads as thread (thread.id)}
  <a class="list-strip forum-thread-link" href={threadPath(workspace, projectSlug, thread.id)}>
    <div class="list-strip-info">
      <h3>{thread.title}</h3>
      {#if thread.createdAt}<time class="list-strip-meta" datetime={thread.createdAt}
          >{new Date(thread.createdAt).toLocaleDateString(
            language === 'pl' ? 'pl-PL' : 'en-GB'
          )}</time
        >{/if}
    </div>
    <span class="tag"
      >{thread.visibility === 'leaders'
        ? 'Leaders'
        : thread.visibility === 'members'
          ? 'Project members'
          : 'Association members'}</span
    >
  </a>
{/each}
{#if !threads.length}<p class="muted">{'No threads yet.'}</p>{/if}

{#if composer}
  <div class="card" style="margin-top: 20px;">
    <h2 style="font-size: 1rem; margin-bottom: 14px;">{'New thread'}</h2>
    <label for="thread-title">{'Subject'}</label>
    <input id="thread-title" bind:value={title} required />
    <Assignees {projectId} bind:value={assignees} {language} disabled={busy} />
    <label for="thread-vis">{'Visibility'}</label>
    <Dropdown
      id="thread-vis"
      label={'Visibility'}
      bind:value={visibility}
      options={[
        { value: 'association', label: 'Association members' },
        ...(projectId ? [{ value: 'members', label: 'Project members' }] : []),
        { value: 'leaders', label: 'Leaders' }
      ]}
    />
    <div class="forum-editor-gap">
      <Editor {language} bind:value={markdown} />
    </div>
    <div class="row" style="margin-top: 12px; gap: 8px;">
      <button class="btn" disabled={busy || !title.trim()} onclick={create}
        >{'Create thread'}</button
      >
      <button class="btn btn-outline" disabled={busy} onclick={() => (composer = false)}
        >{'Cancel'}</button
      >
    </div>
  </div>
{/if}
