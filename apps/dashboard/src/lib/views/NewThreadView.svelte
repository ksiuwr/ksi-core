<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import Assignees from '$lib/Assignees.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, threadPath, type Workspace } from '$lib/navigation';
  import type { Thread } from '$lib/types';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import { ArrowLeft, MessageSquarePlus } from '@lucide/svelte';
  import { untrack } from 'svelte';

  let {
    workspace,
    projectSlug,
    projectId
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
  } = $props();
  const language = $derived(preferences.language);

  let title = $state('');
  let markdown = $state('');
  let visibility = $state(untrack(() => (projectId ? 'members' : 'association')));
  let assignees = $state<string[]>([]);
  let busy = $state(false);
  let error = $state('');

  async function create() {
    if (busy || !title.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Thread>('/platform/threads', 'POST', {
        assigneeIds: assignees,
        title: title.trim(),
        markdown,
        visibility,
        invitedIds: [],
        ...(projectId ? { projectId } : {})
      });
      await goto(threadPath(workspace, projectSlug, result.id));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<a class="btn btn-outline detail-back" href={dashboardPath(workspace, projectSlug, 'forum')}
  ><ArrowLeft size={15} aria-hidden="true" />{'Forum'}</a
>
<header class="create-heading">
  <h1>New thread</h1>
  <p>Start a focused discussion and choose who can see it.</p>
</header>

{#if error}<p class="error" role="alert">{error}</p>{/if}
<form
  class="detail-layout create-form"
  onsubmit={(event) => {
    event.preventDefault();
    void create();
  }}
>
  <section class="card create-main">
    <div>
      <label for="new-thread-title">Subject</label>
      <input id="new-thread-title" bind:value={title} required maxlength="200" />
    </div>
    <div>
      <span class="create-label">First post</span>
      <Editor bind:value={markdown} rows={18} allowReferences />
    </div>
  </section>

  <aside class="card create-aside">
    <section class="create-section">
      <label for="new-thread-visibility">Visibility</label>
      <Dropdown
        id="new-thread-visibility"
        label={'Visibility'}
        bind:value={visibility}
        options={[
          { value: 'association', label: 'Association members' },
          ...(projectId ? [{ value: 'members', label: 'Project members' }] : []),
          { value: 'leaders', label: 'Leaders' }
        ]}
      />
    </section>
    <section class="create-section">
      <Assignees {projectId} bind:value={assignees} disabled={busy} />
    </section>
    <div class="create-actions">
      <button class="btn" disabled={busy || !title.trim()}
        ><MessageSquarePlus size={15} aria-hidden="true" />{busy
          ? 'Creating…'
          : 'Create thread'}</button
      >
      <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'forum')}>Cancel</a>
    </div>
  </aside>
</form>
