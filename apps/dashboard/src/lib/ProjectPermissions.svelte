<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Save, Trash2 } from '@lucide/svelte';

  type Group = { name: string; permissions: string[]; userIds: string[] };
  let {
    project,
    onrefresh
  }: { project: { id: string; slug: string }; onrefresh: () => Promise<void> } = $props();
  let members = $state<{ id: string; firstName: string; lastName: string }[]>([]);
  let groups = $state<Group[]>([]);
  let memberPermissions = $state<string[]>([]);
  let nonMemberPermissions = $state<string[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');

  const articlePermissions = [
    'articles.content.propose',
    'articles.content.publish',
    'articles.content.edit-any'
  ];
  const info = $derived<Record<string, [string, string]>>({
    'articles.content.propose': [
      'Create and propose articles',
      'Create project articles and suggest changes to existing articles.'
    ],
    'articles.content.publish': [
      'Publish articles',
      'Review and publish project articles and proposed changes.'
    ],
    'articles.content.edit-any': [
      'Edit articles created by anyone',
      'Edit any project article, but publishing still requires publish permission.'
    ],
    'projects.preview-credentials.read': [
      'View preview sign-in credentials',
      'Show generated sample account passwords for this project’s previews.'
    ]
  });
  const groupPermissions = $derived(
    project.slug === 'ksi-core'
      ? [...articlePermissions, 'projects.preview-credentials.read']
      : articlePermissions
  );

  async function load() {
    loading = true;
    error = '';
    try {
      const [membersResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/platform/projects/${encodeURIComponent(project.id)}/members`),
        fetch(`/api/platform/projects/${encodeURIComponent(project.id)}/permissions`)
      ]);
      if (!membersResponse.ok || !permissionsResponse.ok)
        throw new Error('Unable to load project permissions.');
      members = await membersResponse.json();
      const data = await permissionsResponse.json();
      groups = data.groups;
      memberPermissions = data.memberPermissions;
      nonMemberPermissions = data.nonMemberPermissions;
    } catch {
      error = 'Unable to load project permissions.';
    } finally {
      loading = false;
    }
  }

  async function save() {
    busy = true;
    error = '';
    notice = '';
    try {
      const response = await fetch(
        `/api/platform/projects/${encodeURIComponent(project.id)}/permissions`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ groups, memberPermissions, nonMemberPermissions })
        }
      );
      if (!response.ok) throw new Error('Unable to save project permissions.');
      notice = 'Project permissions saved.';
      await load();
      await onrefresh();
    } catch {
      error = 'Unable to save project permissions.';
    } finally {
      busy = false;
    }
  }

  onMount(() => void load());
</script>

<div class="workspace-header">
  <div>
    <h1>Project permissions</h1>
    <p class="muted">
      Choose article access defaults and create named groups for additional project permissions.
    </p>
  </div>
  <button
    class="btn"
    disabled={busy || loading || groups.some((group) => !group.name.trim())}
    onclick={() => void save()}><Save size={15} />{'Save permissions'}</button
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if notice}<p class="notice" role="status">{notice}</p>{/if}
{#if loading}<p class="muted">Loading project permissions…</p>
{:else}
  <div class="settings-main">
    <section class="settings-section">
      <header>
        <h2>Default project access</h2>
        <p>
          {'These permissions apply to everyone in the selected category. They are additional to existing account-role permissions.'}
          {'Active KSI members who are not members of this project.'}
        </p>
      </header>
      <div class="card matrix">
        <div class="matrix-row matrix-head">
          <span></span>
          <span>Project members</span>
          <span>Non-members</span>
        </div>
        {#each articlePermissions as permission}
          <div class="matrix-row">
            <div>
              <strong>{info[permission]?.[0]}</strong>
              <small>{info[permission]?.[1]}</small>
            </div>
            <label class="matrix-cell">
              <input
                type="checkbox"
                value={permission}
                bind:group={memberPermissions}
                aria-label={`${'Project members'}: ${info[permission]?.[0]}`}
              />
            </label>
            <label class="matrix-cell">
              <input
                type="checkbox"
                value={permission}
                bind:group={nonMemberPermissions}
                aria-label={`${'Non-members'}: ${info[permission]?.[0]}`}
              />
            </label>
          </div>
        {/each}
      </div>
    </section>

    <section class="settings-section">
      <header class="group-header">
        <div>
          <h2>Named groups</h2>
          <p>Only active project members can be assigned to a group.</p>
        </div>
        <button
          type="button"
          class="btn btn-outline"
          disabled={busy || groups.length >= 30}
          onclick={() => (groups = [...groups, { name: '', permissions: [], userIds: [] }])}
          ><Plus size={15} aria-hidden="true" />{'Add group'}</button
        >
      </header>
      {#each groups as group, index (index)}
        <div class="card group-card">
          <div class="group-top">
            <div class="group-name">
              <label for={`group-name-${index}`}>Group name</label>
              <input
                id={`group-name-${index}`}
                bind:value={group.name}
                maxlength="60"
                placeholder="Example: Maintainers"
                required
              />
            </div>
            <button
              type="button"
              class="btn btn-outline danger-button"
              disabled={busy}
              onclick={() => (groups = groups.filter((_, i) => i !== index))}
              ><Trash2 size={15} aria-hidden="true" />{'Remove group'}</button
            >
          </div>
          <div class="group-columns">
            <fieldset>
              <legend>Members</legend>
              {#each members as member}
                <label class="check"
                  ><input
                    type="checkbox"
                    value={member.id}
                    bind:group={group.userIds}
                  />{member.firstName}
                  {member.lastName}</label
                >
              {/each}
            </fieldset>
            <fieldset>
              <legend>Permissions</legend>
              {#each groupPermissions as permission}
                <label class="check permission-option">
                  <input type="checkbox" value={permission} bind:group={group.permissions} />
                  <span>
                    <strong>{info[permission]?.[0]}</strong>
                    <small>{info[permission]?.[1]}</small>
                  </span>
                </label>
              {/each}
            </fieldset>
          </div>
        </div>
      {:else}
        <p class="list-empty">No groups yet.</p>
      {/each}
    </section>
  </div>
{/if}

<style>
  .matrix {
    display: grid;
    padding: 4px 20px 12px;
  }
  .matrix-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px 110px;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
  }
  .matrix-row + .matrix-row {
    border-top: 1px solid var(--line);
  }
  .matrix-head {
    padding: 12px 0 8px;
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
  .matrix-row strong,
  .permission-option strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
  }
  .matrix-row small,
  .permission-option small {
    display: block;
    margin-top: 2px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .matrix-cell {
    display: grid;
    place-items: center;
    margin: 0;
    padding: 6px;
    cursor: pointer;
  }
  .group-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .group-card {
    display: grid;
    gap: 18px;
    padding: 20px;
  }
  .group-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .group-name {
    flex: 1 1 260px;
    max-width: 420px;
  }
  .group-name input {
    margin: 0;
  }
  .group-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }
  fieldset {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 12px 16px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
  }
  legend {
    padding: 0 6px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
  }
  .permission-option {
    align-items: flex-start;
  }
  .notice {
    margin: 0 0 16px;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }
  @media (max-width: 760px) {
    .group-columns {
      grid-template-columns: minmax(0, 1fr);
    }
    .matrix-row {
      grid-template-columns: minmax(0, 1fr) 72px 72px;
    }
  }
</style>
