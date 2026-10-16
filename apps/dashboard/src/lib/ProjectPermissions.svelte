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
    <h1>{'Project permissions'}</h1>
    <p class="muted">
      {'Choose article access defaults and create named groups for additional project permissions.'}
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
{#if loading}<p class="muted">{'Loading project permissions…'}</p>
{:else}
  <section class="card fields">
    <h2>{'Default project access'}</h2>
    <p class="muted">
      {'These permissions apply to everyone in the selected category. They are additional to existing account-role permissions.'}
    </p>
    <fieldset class="permission-card">
      <legend>{'Project members'}</legend>
      {#each articlePermissions as permission}
        <label class="check permission-option">
          <input type="checkbox" value={permission} bind:group={memberPermissions} />
          <span>
            <strong
              >{permission === 'articles.content.propose'
                ? 'Create and propose articles'
                : permission === 'articles.content.publish'
                  ? 'Publish articles'
                  : 'Edit articles created by anyone'}</strong
            >
            <small
              >{permission === 'articles.content.propose'
                ? 'Create project articles and suggest changes to existing articles.'
                : permission === 'articles.content.publish'
                  ? 'Review and publish project articles and proposed changes.'
                  : 'Edit any project article, but publishing still requires publish permission.'}</small
            >
          </span>
        </label>
      {/each}
    </fieldset>
    <fieldset class="permission-card">
      <legend>{'Non-members'}</legend>
      <p class="muted">{'Active KSI members who are not members of this project.'}</p>
      {#each articlePermissions as permission}
        <label class="check permission-option">
          <input type="checkbox" value={permission} bind:group={nonMemberPermissions} />
          <span>
            <strong
              >{permission === 'articles.content.propose'
                ? 'Create and propose articles'
                : permission === 'articles.content.publish'
                  ? 'Publish articles'
                  : 'Edit articles created by anyone'}</strong
            >
            <small
              >{permission === 'articles.content.propose'
                ? 'Create project articles and suggest changes to existing articles.'
                : permission === 'articles.content.publish'
                  ? 'Review and publish project articles and proposed changes.'
                  : 'Edit any project article, but publishing still requires publish permission.'}</small
            >
          </span>
        </label>
      {/each}
    </fieldset>
  </section>

  <section class="card fields">
    <div>
      <h2>{'Named groups'}</h2>
      <p class="muted">{'Only active project members can be assigned to a group.'}</p>
    </div>
    {#each groups as group, index (index)}
      <fieldset class="permission-card">
        <legend>{group.name || `Group ${index + 1}`}</legend>
        <label
          >{'Group name'}<input
            bind:value={group.name}
            maxlength="60"
            placeholder="Example: Maintainers"
            required
          /></label
        >
        <div class="choice-list">
          <p class="muted">{'Members'}</p>
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
        </div>
        <div class="choice-list">
          <p class="muted">{'Permissions'}</p>
          {#each groupPermissions as permission}
            <label class="check permission-option">
              <input type="checkbox" value={permission} bind:group={group.permissions} />
              <span>
                <strong
                  >{permission === 'articles.content.propose'
                    ? 'Create and propose articles'
                    : permission === 'articles.content.publish'
                      ? 'Publish articles'
                      : permission === 'articles.content.edit-any'
                        ? 'Edit articles created by anyone'
                        : 'View preview sign-in credentials'}</strong
                >
                <small
                  >{permission === 'articles.content.propose'
                    ? 'Create project articles and suggest changes to existing articles.'
                    : permission === 'articles.content.publish'
                      ? 'Review and publish project articles and proposed changes.'
                      : permission === 'articles.content.edit-any'
                        ? 'Edit any project article, but publishing still requires publish permission.'
                        : 'Show generated sample account passwords for this project’s previews.'}</small
                >
              </span>
            </label>
          {/each}
        </div>
        <button
          type="button"
          class="btn btn-outline"
          disabled={busy}
          onclick={() => (groups = groups.filter((_, i) => i !== index))}
          ><Trash2 size={15} />{'Remove group'}</button
        >
      </fieldset>
    {/each}
    <button
      type="button"
      class="btn btn-outline"
      disabled={busy || groups.length >= 30}
      onclick={() => (groups = [...groups, { name: '', permissions: [], userIds: [] }])}
      ><Plus size={15} />{'Add group'}</button
    >
  </section>
{/if}

<style>
  .fields,
  .permission-card,
  .choice-list,
  .permission-option span {
    display: grid;
    gap: 10px;
  }
  .permission-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
  }
  .permission-option {
    align-items: flex-start;
  }
  .permission-option span {
    gap: 3px;
  }
  .permission-option small {
    color: var(--text-muted);
    line-height: 1.45;
  }
  .notice {
    margin: 0 0 16px;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface-muted);
    color: var(--text);
  }
  h1,
  h2,
  p {
    margin-top: 0;
  }
</style>
