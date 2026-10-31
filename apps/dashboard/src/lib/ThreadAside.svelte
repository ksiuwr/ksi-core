<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import Assignees from './Assignees.svelte';
  import WatchButton from './WatchButton.svelte';
  import { api, errorMessage } from '$lib/api';
  import type { AssignmentMember, Thread } from '$lib/types';
  import { Archive, RotateCcw } from '@lucide/svelte';

  let {
    thread,
    members,
    canManage,
    refresh
  }: {
    thread: Thread;
    members: AssignmentMember[];
    canManage: boolean;
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');

  const archived = $derived(!!thread.archivedAt);
  const created = $derived(thread.createdAt ? formatDate(thread.createdAt, language) : null);

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

<aside class="detail-aside" aria-label={'Szczegóły wątku'}>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <section class="aside-section">
    <dl class="metadata-list">
      <div>
        <dt>Widoczność</dt>
        <dd>
          {thread.visibility === 'leaders'
            ? 'Liderzy'
            : thread.visibility === 'members'
              ? 'Członkowie projektu'
              : 'Członkowie koła'}
        </dd>
      </div>
      {#if created}
        <div>
          <dt>Utworzono</dt>
          <dd><time datetime={thread.createdAt}>{created}</time></dd>
        </div>
      {/if}
    </dl>
  </section>

  <section class="aside-section">
    <h2>Przypisane osoby</h2>
    <Assignees
      value={thread.assigneeIds ?? []}
      {members}
      showLabel={false}
      disabled={busy || archived}
      onchange={updateAssignees}
    />
  </section>

  <section class="aside-section">
    <h2>Powiadomienia</h2>
    {#key (thread.assigneeIds ?? []).join(',')}
      <WatchButton type="thread" id={thread.id} showLabel />
    {/key}
  </section>

  <section class="aside-section aside-actions">
    {#if canManage}
      <button class="btn btn-outline" disabled={busy} onclick={toggleArchive}>
        {#if archived}<RotateCcw size={15} aria-hidden="true" />Przywróć wątek{:else}<Archive
            size={15}
            aria-hidden="true"
          />Zarchiwizuj wątek{/if}
      </button>
    {/if}
  </section>
</aside>
