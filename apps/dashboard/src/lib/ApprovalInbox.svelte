<script lang="ts">
  import { Check, X, UserPlus, Image, Inbox } from '@lucide/svelte';
  import type { InboxData } from './types';
  export type { InboxData } from './types';
  let {
    inbox,
    language,
    administrator,
    refresh,
    reportError
  }: {
    inbox: InboxData;
    language: 'pl' | 'en';
    administrator: boolean;
    refresh: () => Promise<void>;
    reportError: (message: string) => void;
  } = $props();

  let busy = $state(false);
  async function review(
    kind: 'members' | 'avatars',
    id: string,
    approved: boolean,
    version?: number
  ) {
    busy = true;
    reportError('');
    try {
      const response = await fetch(`/api/users/inbox/${kind}/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved, ...(version ? { version } : {}) })
      });
      const text = await response.text();
      let result: any = {};
      if (text)
        try {
          result = JSON.parse(text);
        } catch {}
      if (!response.ok) throw new Error(result.code ?? 'Request failed');
      await refresh();
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <div>
    <h1>{'Approval inbox'}</h1>
    <p class="workspace-description">
      {'New accounts and profile pictures awaiting a decision.'}
    </p>
  </div>
</div>
{#if inbox.memberships.length}<section class="approval-section">
    <h2>
      <UserPlus size={19} aria-hidden="true" />{'New accounts'}<span class="tag"
        >{inbox.memberships.length}</span
      >
    </h2>
    {#each inbox.memberships as member (member.id)}<article class="approval-card">
        <div>
          <h3>{member.name || member.email}</h3>
          <p>{member.email}</p>
          <time datetime={member.createdAt}
            >{new Date(member.createdAt).toLocaleDateString(
              language === 'pl' ? 'pl-PL' : 'en-GB'
            )}</time
          >
        </div>
        <div class="approval-actions">
          <button class="btn" disabled={busy} onclick={() => review('members', member.id, true)}
            ><Check size={15} aria-hidden="true" />{'Activate'}</button
          >{#if administrator}<button
              class="btn btn-outline"
              disabled={busy}
              onclick={() => review('members', member.id, false)}
              ><X size={15} aria-hidden="true" />{'Decline'}</button
            >{/if}
        </div>
      </article>{/each}
  </section>{/if}
{#if inbox.avatars.length}<section class="approval-section">
    <h2>
      <Image size={19} aria-hidden="true" />{'Profile pictures'}<span class="tag"
        >{inbox.avatars.length}</span
      >
    </h2>
    {#each inbox.avatars as avatar (avatar.userId)}<article class="approval-card">
        <img
          class="approval-avatar"
          src={`/media/${avatar.fileId}`}
          alt={`Proposed avatar: ${avatar.name}`}
        />
        <div class="approval-info">
          <h3>{avatar.name}</h3>
          <p>
            {'The new picture becomes public after approval.'}
          </p>
        </div>
        <div class="approval-actions">
          <button
            class="btn"
            disabled={busy}
            onclick={() => review('avatars', avatar.userId, true, avatar.version)}
            ><Check size={15} aria-hidden="true" />{'Approve'}</button
          ><button
            class="btn btn-outline"
            disabled={busy}
            onclick={() => review('avatars', avatar.userId, false, avatar.version)}
            ><X size={15} aria-hidden="true" />{'Decline'}</button
          >
        </div>
      </article>{/each}
  </section>{/if}
{#if !inbox.memberships.length && !inbox.avatars.length}<div class="empty-state">
    <Inbox size={30} aria-hidden="true" />
    <h2>{'All caught up'}</h2>
    <p>
      {'New requests will appear here automatically.'}
    </p>
  </div>{/if}

<style>
  .approval-section {
    margin-bottom: 32px;
  }
  .approval-section h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    margin-bottom: 16px;
  }
  .approval-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    margin-bottom: 12px;
  }
  .approval-card h3 {
    font-size: 15px;
  }
  .approval-card p,
  .approval-card time {
    color: var(--muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .approval-card time {
    display: block;
    margin-top: 8px;
  }
  .approval-info {
    flex: 1;
  }
  .approval-actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .approval-avatar {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
  }
  @media (max-width: 760px) {
    .approval-card {
      flex-wrap: wrap;
      padding: 16px;
    }
    .approval-actions {
      margin: 0;
      width: 100%;
    }
    .approval-info {
      min-width: 160px;
    }
  }
</style>
