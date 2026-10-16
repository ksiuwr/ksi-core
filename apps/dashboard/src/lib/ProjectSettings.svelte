<script lang="ts">
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import type { ContentTranslations as TranslationData } from 'shared/content-locales';
  import { Save, ArrowUpRight, Plus, Trash2 } from '@lucide/svelte';
  import Skeleton from './Skeleton.svelte';
  let {
    project,
    canEdit,
    canManageMembers,
    onrefresh,
    language,
    websiteOrigin
  }: {
    language: 'pl' | 'en';
    websiteOrigin: string;
    project: {
      slug: string;
      translations?: TranslationData;
      id: string;
      name: string;
      description: string;
      version: number;
      locked: boolean;
      tags: string[];
      fields: string[];
    };
    canEdit: boolean;
    canManageMembers: boolean;
    onrefresh: () => Promise<void>;
  } = $props();
  let name = $state(''),
    description = $state(''),
    tags = $state(''),
    fields = $state<string[]>([]),
    locked = $state(false),
    leaders = $state<string[]>([]);
  let members = $state<{ id: string; firstName: string; lastName: string; leader: boolean }[]>([]),
    requests = $state<
      { request: { id: string; userId: string }; firstName: string; lastName: string }[]
    >([]);
  let busy = $state(false),
    loading = $state(true),
    error = $state(''),
    notice = $state('');
  let generation = 0;
  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(
      `/api/platform/projects/${encodeURIComponent(project.id)}${path}`,
      {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    );
    const result = await response.json();
    if (!response.ok) {
      const messages: Record<string, string> = {
        REVISION_CONFLICT: 'This project changed. Reload before saving.',
        ACTIVE_LEADER_REQUIRED: 'Select at least one active leader.',
        FINAL_PROJECT_LEADER: 'Assign another leader before removing this member.'
      };
      throw new Error(messages[result.code] ?? result.code ?? 'Request failed');
    }
    return result;
  }
  $effect(() => {
    name = project.name;
    description = project.description;
    tags = project.tags.join(', ');
    fields = [...project.fields];
    locked = project.locked;
  });
  $effect(() => {
    const id = project.id,
      current = ++generation;
    loading = true;
    void Promise.all([
      api('/members'),
      canManageMembers ? api('/join-requests') : Promise.resolve([])
    ])
      .then(([roster, pending]) => {
        if (current !== generation || id !== project.id) return;
        members = roster;
        leaders = roster
          .filter((m: { leader: boolean }) => m.leader)
          .map((m: { id: string }) => m.id);
        requests = pending;
      })
      .catch((e) => {
        if (current === generation) error = e.message;
      })
      .finally(() => {
        if (current === generation) loading = false;
      });
  });
  async function action(work: () => Promise<unknown>) {
    busy = true;
    error = '';
    notice = '';
    try {
      await work();
      notice = 'Changes saved.';
      await onrefresh();
      if (canManageMembers) {
        members = await api('/members');
        requests = await api('/join-requests');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Request failed';
    } finally {
      busy = false;
    }
  }
  let links = $state<{ label: string; url: string; translations?: TranslationData }[]>([]);
  $effect(() => {
    const id = project.id;
    if (canEdit)
      void api('/links')
        .then((result) => {
          if (project.id === id) links = result;
        })
        .catch((e) => (error = e.message));
  });
  let removing = $state<string | null>(null);
</script>

<div class="workspace-header">
  <h1>{'Project settings'}</h1>
  <a class="btn btn-outline" href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
    ><ArrowUpRight size={15} />{'View public project'}</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}{#if notice}<p role="status">
    {notice}
  </p>{/if}
{#if !canEdit && !canManageMembers}<p role="alert">
    {'You do not have permission to manage this project.'}
  </p>{:else}
  <div class="settings-grid">
    {#if canEdit}<form
        class="card fields"
        onsubmit={(e) => {
          e.preventDefault();
          void action(() =>
            api('', 'PATCH', {
              version: project.version,
              name,
              description,
              locked,
              tags: tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              fields
            })
          );
        }}
      >
        <h2>{'Project details'}</h2>
        <label>{'Name'}<input bind:value={name} required maxlength="200" /></label><label
          >{'Description'}<textarea bind:value={description} rows="6" maxlength="10000"
          ></textarea></label
        ><div class="description-preview"><span class="muted">{'Preview'}</span><MarkdownContent value={description} /></div>
        <label>{'Tags (comma separated)'}<input bind:value={tags} /></label>
        <fieldset>
          <legend>{'Fields'}</legend>{#each ['research', 'community', 'engineering'] as field}<label
              class="check"
              ><input type="checkbox" value={field} bind:group={fields} />{field === 'research'
                ? 'Research'
                : field === 'community'
                  ? 'Community'
                  : 'Engineering'}</label
            >{/each}
        </fieldset>
        <label class="check"
          ><input type="checkbox" bind:checked={locked} />{'Require approval to join'}</label
        ><button class="btn" disabled={busy || !fields.length}
          ><Save size={15} />{'Save project'}</button
        >
      </form>{/if}
    {#if canManageMembers}<div class="management">
        {#if loading}<Skeleton label="Loading project members" />{:else}
          <form
            class="card fields"
            onsubmit={(e) => {
              e.preventDefault();
              void action(() => api('/leaders', 'PUT', { userIds: leaders }));
            }}
          >
            <h2>{'Project leaders'}</h2>
            <p class="muted">{'Select at least one leader from the project members.'}</p>
            {#each members as member}<label class="check"
                ><input type="checkbox" value={member.id} bind:group={leaders} />{member.firstName}
                {member.lastName}</label
              >{/each}<button class="btn btn-outline" disabled={busy || !leaders.length}
              >{'Save leaders'}</button
            >
          </form>
          <section class="card fields">
            <h2>{'Join requests'}</h2>
            {#each requests as request}<div class="request">
                <a href={`/people/${encodeURIComponent(request.request.userId)}`}
                  >{request.firstName} {request.lastName}</a
                >
                <div class="row">
                  <button
                    class="btn btn-outline"
                    disabled={busy}
                    onclick={() =>
                      action(() =>
                        api(`/join-requests/${request.request.id}`, 'POST', { accept: true })
                      )}>{'Accept'}</button
                  ><button
                    class="btn btn-outline"
                    disabled={busy}
                    onclick={() =>
                      action(() =>
                        api(`/join-requests/${request.request.id}`, 'POST', { accept: false })
                      )}>{'Decline'}</button
                  >
                </div>
              </div>{:else}<p class="muted">{'No pending requests.'}</p>{/each}
          </section>
          <section class="card fields">
            <h2>{'Membership'}</h2>
            {#each members as member}<div class="request">
                <a href={`/people/${encodeURIComponent(member.id)}`}
                  >{member.firstName} {member.lastName}</a
                >{#if removing === member.id}<div class="row">
                    <button
                      class="btn btn-outline danger-button"
                      disabled={busy}
                      onclick={() =>
                        action(async () => {
                          await api(`/members/${member.id}`, 'DELETE');
                          removing = null;
                        })}>{'Confirm removal'}</button
                    ><button class="btn btn-outline" onclick={() => (removing = null)}
                      >{'Cancel'}</button
                    >
                  </div>{:else}<button
                    class="btn btn-outline"
                    disabled={busy}
                    onclick={() => (removing = member.id)}>{'Remove from project'}</button
                  >{/if}
              </div>{/each}
          </section>
        {/if}
      </div>{/if}
  </div>
  {#if canEdit}<ContentTranslations
      kind="project"
      id={project.id}
      version={project.version}
      translations={project.translations}
      baseline={{ name: project.name, description: project.description, tags: project.tags }}
      {language}
      onsaved={onrefresh}
    />{/if}
  {#if canEdit}
    <form
      class="card fields project-links"
      onsubmit={(e) => {
        e.preventDefault();
        void action(() =>
          api('/links', 'PUT', {
            links: links.map(({ label, url, translations }) => ({ label, url, translations }))
          })
        );
      }}
    >
      <h2>{'Public links'}</h2>
      <p class="muted">{'English labels are required. Polish labels are optional.'}</p>
      {#each links as link, index}<div class="link-fields">
          <label
            >{'Label · English'}<input bind:value={link.label} required maxlength="200" /></label
          >
          <label>{'URL'}<input type="url" bind:value={link.url} required maxlength="2000" /></label>
          <label
            >{'Label · Polish'}<input
              value={link.translations?.pl?.label ?? ''}
              maxlength="200"
              oninput={(e) => (link.translations = { pl: { label: e.currentTarget.value } })}
            /></label
          >
          <button
            class="btn btn-outline"
            type="button"
            onclick={() => (links = links.filter((_, i) => i !== index))}
            ><Trash2 size={15} />{'Remove link'}</button
          >
        </div>{/each}
      <div class="row">
        <button
          class="btn btn-outline"
          type="button"
          disabled={links.length >= 50}
          onclick={() => (links = [...links, { label: '', url: '' }])}
          ><Plus size={15} />{'Add link'}</button
        ><button class="btn" disabled={busy}><Save size={15} />{'Save links'}</button>
      </div>
    </form>
  {/if}
{/if}

<style>
  .project-links {
    margin-top: 20px;
  }
  .link-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--border);
  }
  @media (max-width: 600px) {
    .link-fields {
      grid-template-columns: 1fr;
    }
  }
  .settings-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 24px;
    margin-top: 24px;
    align-items: start;
  }
  .fields,
  .management {
    display: grid;
    gap: 18px;
  }
  .fields label:not(.check) {
    display: grid;
    gap: 8px;
  }
  .fields input,
  .fields textarea {
    margin: 0;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .check input {
    width: 18px;
    height: 18px;
  }
  .fields button {
    width: fit-content;
  }
  fieldset {
    border: 1px solid var(--line);
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .request {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .request a {
    color: var(--ink);
  }
  .fields h2 {
    margin: 0;
  }
  @media (max-width: 900px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
