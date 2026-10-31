<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import SettingsNav from './SettingsNav.svelte';
  import {
    contentLocaleName,
    translationLocales,
    primaryContentLocale,
    type ContentLocale,
    type ContentTranslations as TranslationData
  } from 'shared/content-locales';
  import { Save, ArrowUpRight, Plus, Trash2, Info, Users, Link2 } from '@lucide/svelte';
  import Skeleton from './Skeleton.svelte';

  let {
    project,
    canEdit,
    canManageMembers,
    onrefresh,
    websiteOrigin
  }: {
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
  const language = $derived(preferences.language);

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
  let contentLocale = $state<ContentLocale>(primaryContentLocale);
  let translationDraft = $state<Record<string, string>>({});
  const projectFields = {
    research: 'Badania',
    community: 'Społeczność',
    engineering: 'Inżynieria'
  } as const;

  type LocalizedProjectField = 'name' | 'description' | 'tags';
  function localized(key: LocalizedProjectField) {
    const primary = key === 'name' ? name : key === 'description' ? description : tags;
    return contentLocale === primaryContentLocale ? primary : (translationDraft[key] ?? '');
  }
  function setLocalized(key: LocalizedProjectField, value: string) {
    if (contentLocale !== primaryContentLocale) translationDraft[key] = value;
    else if (key === 'name') name = value;
    else if (key === 'description') description = value;
    else tags = value;
  }

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
        REVISION_CONFLICT: 'Projekt został zmieniony. Odśwież stronę przed zapisaniem.',
        ACTIVE_LEADER_REQUIRED: 'Wybierz co najmniej jednego aktywnego lidera.',
        FINAL_PROJECT_LEADER: 'Przed usunięciem tej osoby przypisz innego lidera.'
      };
      throw new Error(messages[result.code] ?? result.code ?? 'Żądanie nie powiodło się');
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
      notice = 'Zmiany zapisane.';
      await onrefresh();
      if (canManageMembers) {
        members = await api('/members');
        requests = await api('/join-requests');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Żądanie nie powiodło się';
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
    <h1>Ustawienia projektu</h1>
    <p>{project.name}</p>
  </div>
  <a class="btn btn-outline" href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
    ><ArrowUpRight size={15} aria-hidden="true" />Zobacz publiczny projekt</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}{#if notice}<p role="status">
    {notice}
  </p>{/if}
{#if !canEdit && !canManageMembers}<p role="alert">
    Nie masz uprawnień do zarządzania tym projektem.
  </p>{:else}
  <div class="settings-layout">
    <SettingsNav
      label={'Ustawienia projektu'}
      items={[
        ...(canEdit ? [{ id: 'details', label: 'Dane projektu', icon: Info }] : []),
        ...(canManageMembers ? [{ id: 'members', label: 'Członkowie', icon: Users }] : []),
        ...(canEdit ? [{ id: 'links', label: 'Linki publiczne', icon: Link2 }] : [])
      ]}
    />

    <div class="settings-main">
      {#if canEdit}
        <section id="details" class="settings-section" aria-labelledby="details-heading">
          <header><h2 id="details-heading">Dane projektu</h2></header>
          <form
            class="card settings-card"
            onsubmit={(e) => {
              e.preventDefault();
              if (contentLocale !== primaryContentLocale) return;
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
            <ContentTranslations
              kind="project"
              id={project.id}
              version={project.version}
              translations={project.translations}
              baseline={{
                name,
                description,
                tags: tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              }}
              bind:selected={contentLocale}
              bind:draft={translationDraft}
              onsaved={onrefresh}
            />
            <div>
              <label for="project-name">Nazwa</label>
              <input
                id="project-name"
                bind:value={() => localized('name'), (value) => setLocalized('name', value)}
                required={contentLocale === primaryContentLocale}
                maxlength="200"
              />
            </div>
            <div>
              <label for="project-description">Opis</label>
              <Editor
                bind:value={
                  () => localized('description'), (value) => setLocalized('description', value)
                }
                rows={6}
              />
            </div>
            <div>
              <label for="project-tags">Tagi (oddzielone przecinkami)</label>
              <input
                id="project-tags"
                bind:value={() => localized('tags'), (value) => setLocalized('tags', value)}
              />
            </div>
            {#if contentLocale === primaryContentLocale}<fieldset>
                <legend>Obszary</legend>
                <div class="check-row">
                  {#each Object.entries(projectFields) as [field, label]}<label class="check"
                      ><input type="checkbox" value={field} bind:group={fields} />{label}</label
                    >{/each}
                </div>
              </fieldset>
              <label class="check"
                ><input type="checkbox" bind:checked={locked} />Dołączenie wymaga akceptacji</label
              >
              <div class="card-footer">
                <button class="btn" disabled={busy || !fields.length}
                  ><Save size={15} aria-hidden="true" />Zapisz projekt</button
                >
              </div>
            {/if}
          </form>
        </section>
      {/if}

      {#if canManageMembers}
        <section id="members" class="settings-section" aria-labelledby="members-heading">
          <header><h2 id="members-heading">Członkowie</h2></header>
          {#if loading}<Skeleton label="Ładowanie członków projektu" />{:else}
            <form
              class="card settings-card"
              onsubmit={(e) => {
                e.preventDefault();
                void action(() => api('/leaders', 'PUT', { userIds: leaders }));
              }}
            >
              <div>
                <h3>Liderzy projektu</h3>
                <p class="muted">Wybierz co najmniej jednego lidera spośród członków projektu.</p>
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
                  >Zapisz liderów</button
                >
              </div>
            </form>

            <section class="card settings-card">
              <h3>Prośby o dołączenie</h3>
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
                        )}>Akceptuj</button
                    ><button
                      class="btn btn-outline btn-sm"
                      disabled={busy}
                      onclick={() =>
                        action(() =>
                          api(`/join-requests/${request.request.id}`, 'POST', { accept: false })
                        )}>Odrzuć</button
                    >
                  </div>
                </div>{:else}<p class="muted">Brak oczekujących próśb.</p>{/each}
            </section>

            <section class="card settings-card">
              <h3>Członkostwo</h3>
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
                            })}>Tak, usuń</button
                        ><button class="btn btn-outline btn-sm" onclick={() => (removing = null)}
                          >Anuluj</button
                        >
                      </div>{:else}<button
                        class="btn btn-outline btn-sm"
                        disabled={busy}
                        onclick={() => (removing = member.id)}>Usuń z projektu</button
                      >{/if}
                  </div>{/each}
              </div>
            </section>
          {/if}
        </section>
      {/if}

      {#if canEdit}
        <section id="links" class="settings-section" aria-labelledby="links-heading">
          <header>
            <h2 id="links-heading">Linki publiczne</h2>
            <p>Etykiety polskie są wymagane. Etykiety w innych językach są opcjonalne.</p>
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
                  <label for={`link-label-${index}`}
                    >Etykieta · {contentLocaleName(primaryContentLocale, language)}</label
                  ><input
                    id={`link-label-${index}`}
                    bind:value={link.label}
                    required
                    maxlength="200"
                  />
                </div>
                <div>
                  <label for={`link-url-${index}`}>URL</label><input
                    id={`link-url-${index}`}
                    type="url"
                    bind:value={link.url}
                    required
                    maxlength="2000"
                  />
                </div>
                {#each translationLocales as locale}
                  <div>
                    <label for={`link-${locale}-${index}`}
                      >Etykieta · {contentLocaleName(locale, language)}</label
                    ><input
                      id={`link-${locale}-${index}`}
                      value={link.translations?.[locale]?.label ?? ''}
                      maxlength="200"
                      oninput={(e) =>
                        (link.translations = {
                          ...link.translations,
                          [locale]: { label: e.currentTarget.value }
                        })}
                    />
                  </div>
                {/each}
                <button
                  class="btn btn-outline"
                  type="button"
                  onclick={() => (links = links.filter((_, i) => i !== index))}
                  ><Trash2 size={15} aria-hidden="true" />Usuń link</button
                >
              </div>{/each}
            <div class="card-footer">
              <button
                class="btn btn-outline"
                type="button"
                disabled={links.length >= 50}
                onclick={() => (links = [...links, { label: '', url: '' }])}
                ><Plus size={15} aria-hidden="true" />Dodaj link</button
              ><button class="btn" disabled={busy}
                ><Save size={15} aria-hidden="true" />Zapisz linki</button
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
