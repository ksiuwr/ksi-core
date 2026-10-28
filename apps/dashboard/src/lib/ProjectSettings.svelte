<script lang="ts">
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import SettingsNav from './SettingsNav.svelte';
  import type { ContentTranslations as TranslationData } from 'shared/content-locales';
  import { Save, ArrowUpRight, Plus, Trash2, Info, Users, Languages, Link2 } from '@lucide/svelte';
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
  <div>
    <h1>{'Project settings'}</h1>
    <p>{project.name}</p>
  </div>
  <a class="btn btn-outline" href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
    ><ArrowUpRight size={15} aria-hidden="true" />{'View public project'}</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}{#if notice}<p role="status">
    {notice}
  </p>{/if}
{#if !canEdit && !canManageMembers}<p role="alert">
    {'You do not have permission to manage this project.'}
  </p>{:else}
  <div class="settings-layout">
    <SettingsNav
      label={'Project settings'}
      items={[
        ...(canEdit ? [{ id: 'details', label: 'Project details', icon: Info }] : []),
        ...(canManageMembers ? [{ id: 'members', label: 'Members', icon: Users }] : []),
        ...(canEdit
          ? [
              { id: 'translations', label: 'Public translations', icon: Languages },
              { id: 'links', label: 'Public links', icon: Link2 }
            ]
          : [])
      ]}
    />

    <div class="settings-main">
      {#if canEdit}
        <section id="details" class="settings-section" aria-labelledby="details-heading">
          <header><h2 id="details-heading">{'Project details'}</h2></header>
          <form
            class="card settings-card"
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
            <div>
              <label for="project-name">{'Name'}</label>
              <input id="project-name" bind:value={name} required maxlength="200" />
            </div>
            <div>
              <label for="project-description">{'Description'}</label>
              <Editor {language} bind:value={description} rows={6} />
            </div>
            <div>
              <label for="project-tags">{'Tags (comma separated)'}</label>
              <input id="project-tags" bind:value={tags} />
            </div>
            <fieldset>
              <legend>{'Fields'}</legend>
              <div class="check-row">
                {#each ['research', 'community', 'engineering'] as field}<label class="check"
                    ><input type="checkbox" value={field} bind:group={fields} />{field ===
                    'research'
                      ? 'Research'
                      : field === 'community'
                        ? 'Community'
                        : 'Engineering'}</label
                  >{/each}
              </div>
            </fieldset>
            <label class="check"
              ><input type="checkbox" bind:checked={locked} />{'Require approval to join'}</label
            >
            <div class="card-footer">
              <button class="btn" disabled={busy || !fields.length}
                ><Save size={15} aria-hidden="true" />{'Save project'}</button
              >
            </div>
          </form>
        </section>
      {/if}

      {#if canManageMembers}
        <section id="members" class="settings-section" aria-labelledby="members-heading">
          <header><h2 id="members-heading">{'Members'}</h2></header>
          {#if loading}<Skeleton label="Loading project members" />{:else}
            <form
              class="card settings-card"
              onsubmit={(e) => {
                e.preventDefault();
                void action(() => api('/leaders', 'PUT', { userIds: leaders }));
              }}
            >
              <div>
                <h3>{'Project leaders'}</h3>
                <p class="muted">{'Select at least one leader from the project members.'}</p>
              </div>
              <div class="check-list">
                {#each members as member}<label class="check"
                    ><input
                      type="checkbox"
                      value={member.id}
                      bind:group={leaders}
                    />{member.firstName}
                    {member.lastName}</label
                  >{/each}
              </div>
              <div class="card-footer">
                <button class="btn btn-outline" disabled={busy || !leaders.length}
                  >{'Save leaders'}</button
                >
              </div>
            </form>

            <section class="card settings-card">
              <h3>{'Join requests'}</h3>
              {#each requests as request}<div class="request">
                  <a href={`/people/${encodeURIComponent(request.request.userId)}`}
                    >{request.firstName} {request.lastName}</a
                  >
                  <div class="row">
                    <button
                      class="btn btn-outline btn-sm"
                      disabled={busy}
                      onclick={() =>
                        action(() =>
                          api(`/join-requests/${request.request.id}`, 'POST', { accept: true })
                        )}>{'Accept'}</button
                    ><button
                      class="btn btn-outline btn-sm"
                      disabled={busy}
                      onclick={() =>
                        action(() =>
                          api(`/join-requests/${request.request.id}`, 'POST', { accept: false })
                        )}>{'Decline'}</button
                    >
                  </div>
                </div>{:else}<p class="muted">{'No pending requests.'}</p>{/each}
            </section>

            <section class="card settings-card">
              <h3>{'Membership'}</h3>
              <div class="request-list">
                {#each members as member}<div class="request">
                    <a href={`/people/${encodeURIComponent(member.id)}`}
                      >{member.firstName} {member.lastName}</a
                    >{#if removing === member.id}<div class="row">
                        <button
                          class="btn btn-outline btn-sm danger-button"
                          disabled={busy}
                          onclick={() =>
                            action(async () => {
                              await api(`/members/${member.id}`, 'DELETE');
                              removing = null;
                            })}>{'Confirm removal'}</button
                        ><button class="btn btn-outline btn-sm" onclick={() => (removing = null)}
                          >{'Cancel'}</button
                        >
                      </div>{:else}<button
                        class="btn btn-outline btn-sm"
                        disabled={busy}
                        onclick={() => (removing = member.id)}>{'Remove from project'}</button
                      >{/if}
                  </div>{/each}
              </div>
            </section>
          {/if}
        </section>
      {/if}

      {#if canEdit}
        <section id="translations" class="settings-section">
          <ContentTranslations
            kind="project"
            id={project.id}
            version={project.version}
            translations={project.translations}
            baseline={{ name: project.name, description: project.description, tags: project.tags }}
            {language}
            onsaved={onrefresh}
          />
        </section>

        <section id="links" class="settings-section" aria-labelledby="links-heading">
          <header>
            <h2 id="links-heading">{'Public links'}</h2>
            <p>{'English labels are required. Polish labels are optional.'}</p>
          </header>
          <form
            class="card settings-card"
            onsubmit={(e) => {
              e.preventDefault();
              void action(() =>
                api('/links', 'PUT', {
                  links: links.map(({ label, url, translations }) => ({
                    label,
                    url,
                    translations
                  }))
                })
              );
            }}
          >
            {#each links as link, index}<div class="link-fields">
                <div>
                  <label for={`link-label-${index}`}>{'Label · English'}</label><input
                    id={`link-label-${index}`}
                    bind:value={link.label}
                    required
                    maxlength="200"
                  />
                </div>
                <div>
                  <label for={`link-url-${index}`}>{'URL'}</label><input
                    id={`link-url-${index}`}
                    type="url"
                    bind:value={link.url}
                    required
                    maxlength="2000"
                  />
                </div>
                <div>
                  <label for={`link-pl-${index}`}>{'Label · Polish'}</label><input
                    id={`link-pl-${index}`}
                    value={link.translations?.pl?.label ?? ''}
                    maxlength="200"
                    oninput={(e) => (link.translations = { pl: { label: e.currentTarget.value } })}
                  />
                </div>
                <button
                  class="btn btn-outline"
                  type="button"
                  onclick={() => (links = links.filter((_, i) => i !== index))}
                  ><Trash2 size={15} aria-hidden="true" />{'Remove link'}</button
                >
              </div>{/each}
            <div class="card-footer">
              <button
                class="btn btn-outline"
                type="button"
                disabled={links.length >= 50}
                onclick={() => (links = [...links, { label: '', url: '' }])}
                ><Plus size={15} aria-hidden="true" />{'Add link'}</button
              ><button class="btn" disabled={busy}
                ><Save size={15} aria-hidden="true" />{'Save links'}</button
              >
            </div>
          </form>
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .link-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line);
  }
  .link-fields input {
    margin: 0;
  }
  .link-fields > button {
    width: fit-content;
  }
  .settings-card input,
  .settings-card :global(.editor) {
    margin: 0;
  }
  .settings-card label:not(.check) {
    display: block;
  }
  .card-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 16px;
    margin-top: 2px;
    border-top: 1px solid var(--line);
  }
  .card-footer:first-child {
    padding-top: 0;
    border-top: 0;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .check-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
  }
  .check-list {
    display: grid;
    gap: 10px;
  }
  fieldset {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    display: grid;
    gap: 10px;
  }
  legend {
    padding: 0 6px;
    color: var(--muted);
    font-size: 12px;
  }
  .request-list {
    display: grid;
  }
  .request {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 0;
  }
  .request-list .request + .request {
    border-top: 1px solid var(--line);
  }
  .request a {
    color: var(--ink);
  }
  @media (max-width: 600px) {
    .link-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
