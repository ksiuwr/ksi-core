<script lang="ts">
  import Assignees from './Assignees.svelte';
  import WatchButton from './WatchButton.svelte';
  import { api, errorMessage } from '$lib/api';
  import type { AssignmentMember, Thread } from '$lib/types';
  import { Archive, RotateCcw } from '@lucide/svelte';

  let {
    thread,
    members,
    language,
    canManage,
    refresh
  }: {
    thread: Thread;
    members: AssignmentMember[];
    language: 'pl' | 'en';
    canManage: boolean;
    refresh: () => Promise<void>;
  } = $props();

  let busy = $state(false);
  let error = $state('');

  const archived = $derived(!!thread.archivedAt);
  const created = $derived(
    thread.createdAt
      ? new Date(thread.createdAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-GB')
      : null
  );

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await work();
      await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  function updateAssignees(assigneeIds: string[]) {
    void run(() =>
      api(`/platform/threads/${encodeURIComponent(thread.id)}/assignees`, 'PATCH', {
        version: thread.version,
        assigneeIds
      })
    );
  }

  function toggleArchive() {
    void run(() =>
      api(`/platform/threads/${encodeURIComponent(thread.id)}/archive`, 'POST', {
        version: thread.version,
        archived: !archived
      })
    );
  }
</script>

<aside class="detail-aside" aria-label={'Thread details'}>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <section class="aside-section">
    <dl class="metadata-list">
      <div>
        <dt>Visibility</dt>
        <dd>
          {thread.visibility === 'leaders'
            ? 'Leaders'
            : thread.visibility === 'members'
              ? 'Project members'
              : 'Association members'}
        </dd>
      </div>
      {#if created}
        <div>
          <dt>Created</dt>
          <dd><time datetime={thread.createdAt}>{created}</time></dd>
        </div>
      {/if}
    </dl>
  </section>

  <section class="aside-section">
    <h2>Assignees</h2>
    <Assignees
      value={thread.assigneeIds ?? []}
      {members}
      {language}
      showLabel={false}
      disabled={busy || archived}
      onchange={updateAssignees}
    />
  </section>

  <section class="aside-section">
    <h2>Notifications</h2>
    {#key (thread.assigneeIds ?? []).join(',')}
      <WatchButton type="thread" id={thread.id} {language} showLabel />
    {/key}
  </section>

  <section class="aside-section aside-actions">
    {#if canManage}
      <button class="btn btn-outline" disabled={busy} onclick={toggleArchive}>
        {#if archived}<RotateCcw size={15} aria-hidden="true" />{'Restore thread'}{:else}<Archive
            size={15}
            aria-hidden="true"
          />{'Archive thread'}{/if}
      </button>
    {/if}
  </section>
</aside>
