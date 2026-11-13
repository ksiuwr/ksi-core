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
  import {
    Banner,
    Button,
    Card,
    CheckboxInput,
    Grid,
    Heading,
    HStack,
    Link,
    List,
    ListItem,
    Section,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';

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
    const next = key === 'name' ? value.slice(0, 200) : value;
    if (contentLocale !== primaryContentLocale) translationDraft[key] = next;
    else if (key === 'name') name = next;
    else if (key === 'description') description = next;
    else tags = next;
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

{#snippet plusIcon()}<Plus size={15} aria-hidden="true" />{/snippet}

<HStack gap={4} vAlign="start" justify="between" wrap="wrap">
  <VStack gap={1}>
    <Heading level={1}>Ustawienia projektu</Heading>
    <Text color="secondary">{project.name}</Text>
  </VStack>
  <Button
    variant="secondary"
    label="Zobacz publiczny projekt"
    href={`${websiteOrigin}/projects/${encodeURIComponent(project.slug)}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    {#snippet icon()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
  </Button>
</HStack>

{#if error}<Banner status="error" title={error} role="alert" />{/if}
{#if notice}<Banner status="success" title={notice} role="status" />{/if}

{#if !canEdit && !canManageMembers}
  <Banner status="warning" title="Nie masz uprawnień do zarządzania tym projektem." role="alert" />
{:else}
  <VStack gap={6} class="settings-layout">
    <SettingsNav
      label="Ustawienia projektu"
      items={[
        ...(canEdit ? [{ id: 'details', label: 'Dane projektu', icon: Info }] : []),
        ...(canManageMembers ? [{ id: 'members', label: 'Członkowie', icon: Users }] : []),
        ...(canEdit ? [{ id: 'links', label: 'Linki publiczne', icon: Link2 }] : [])
      ]}
    />

    <VStack gap={6} class="settings-main">
      {#if canEdit}
        <Section id="details" aria-labelledby="details-heading">
          <VStack gap={4}>
            <Heading level={2} id="details-heading">Dane projektu</Heading>
            <form
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
              <Card>
                <VStack gap={4}>
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
                  <TextInput
                    id="project-name"
                    label="Nazwa"
                    value={localized('name')}
                    onChange={(value) => setLocalized('name', value)}
                    isRequired={contentLocale === primaryContentLocale}
                  />
                  <VStack gap={1}>
                    <Text type="label" weight="medium">Opis</Text>
                    <Editor
                      bind:value={
                        () => localized('description'),
                        (value) => setLocalized('description', value)
                      }
                      rows={6}
                    />
                  </VStack>
                  <TextInput
                    id="project-tags"
                    label="Tagi (oddzielone przecinkami)"
                    value={localized('tags')}
                    onChange={(value) => setLocalized('tags', value)}
                  />
                  {#if contentLocale === primaryContentLocale}
                    <fieldset>
                      <legend>Obszary</legend>
                      <HStack gap={3} wrap="wrap">
                        {#each Object.entries(projectFields) as [field, label] (field)}
                          <CheckboxInput
                            {label}
                            value={fields.includes(field)}
                            onChange={() =>
                              (fields = fields.includes(field)
                                ? fields.filter((value) => value !== field)
                                : [...fields, field])}
                          />
                        {/each}
                      </HStack>
                    </fieldset>
                    <CheckboxInput
                      label="Dołączenie wymaga akceptacji"
                      value={locked}
                      onChange={(checked) => (locked = checked)}
                    />
                    <HStack gap={2} justify="end">
                      <Button
                        type="submit"
                        label="Zapisz projekt"
                        isDisabled={busy || !fields.length}
                      >
                        {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                      </Button>
                    </HStack>
                  {/if}
                </VStack>
              </Card>
            </form>
          </VStack>
        </Section>
      {/if}

      {#if canManageMembers}
        <Section id="members" aria-labelledby="members-heading">
          <VStack gap={4}>
            <Heading level={2} id="members-heading">Członkowie</Heading>
            {#if loading}
              <Skeleton label="Ładowanie członków projektu" />
            {:else}
              <form
                onsubmit={(e) => {
                  e.preventDefault();
                  void action(() => api('/leaders', 'PUT', { userIds: leaders }));
                }}
              >
                <Card>
                  <VStack gap={4}>
                    <VStack gap={1}>
                      <Heading level={3}>Liderzy projektu</Heading>
                      <Text type="supporting" color="secondary">
                        Wybierz co najmniej jednego lidera spośród członków projektu.
                      </Text>
                    </VStack>
                    <VStack gap={2}>
                      {#each members as member (member.id)}
                        <CheckboxInput
                          label={`${member.firstName} ${member.lastName}`}
                          value={leaders.includes(member.id)}
                          onChange={() =>
                            (leaders = leaders.includes(member.id)
                              ? leaders.filter((value) => value !== member.id)
                              : [...leaders, member.id])}
                        />
                      {/each}
                    </VStack>
                    <HStack gap={2} justify="end">
                      <Button
                        type="submit"
                        variant="secondary"
                        label="Zapisz liderów"
                        isDisabled={busy || !leaders.length}
                      />
                    </HStack>
                  </VStack>
                </Card>
              </form>

              <Card>
                <VStack gap={3}>
                  <Heading level={3}>Prośby o dołączenie</Heading>
                  {#if requests.length}
                    <List hasDividers>
                      {#each requests as request (request.request.id)}
                        <ListItem>
                          {#snippet label()}
                            <Link href={`/people/${encodeURIComponent(request.request.userId)}`}>
                              {request.firstName}
                              {request.lastName}
                            </Link>
                          {/snippet}
                          {#snippet endContent()}
                            <HStack gap={2}>
                              <Button
                                variant="secondary"
                                size="sm"
                                label="Akceptuj"
                                isDisabled={busy}
                                onclick={() =>
                                  action(() =>
                                    api(`/join-requests/${request.request.id}`, 'POST', {
                                      accept: true
                                    })
                                  )}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                label="Odrzuć"
                                isDisabled={busy}
                                onclick={() =>
                                  action(() =>
                                    api(`/join-requests/${request.request.id}`, 'POST', {
                                      accept: false
                                    })
                                  )}
                              />
                            </HStack>
                          {/snippet}
                        </ListItem>
                      {/each}
                    </List>
                  {:else}
                    <Text type="supporting" color="secondary">Brak oczekujących próśb.</Text>
                  {/if}
                </VStack>
              </Card>

              <Card>
                <VStack gap={3}>
                  <Heading level={3}>Członkostwo</Heading>
                  <List hasDividers>
                    {#each members as member (member.id)}
                      <ListItem>
                        {#snippet label()}
                          <Link href={`/people/${encodeURIComponent(member.id)}`}>
                            {member.firstName}
                            {member.lastName}
                          </Link>
                        {/snippet}
                        {#snippet endContent()}
                          {#if removing === member.id}
                            <HStack gap={2}>
                              <Button
                                variant="destructive"
                                size="sm"
                                label="Tak, usuń"
                                isDisabled={busy}
                                onclick={() =>
                                  action(async () => {
                                    await api(`/members/${member.id}`, 'DELETE');
                                    removing = null;
                                  })}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                label="Anuluj"
                                onclick={() => (removing = null)}
                              />
                            </HStack>
                          {:else}
                            <Button
                              variant="secondary"
                              size="sm"
                              label="Usuń z projektu"
                              isDisabled={busy}
                              onclick={() => (removing = member.id)}
                            />
                          {/if}
                        {/snippet}
                      </ListItem>
                    {/each}
                  </List>
                </VStack>
              </Card>
            {/if}
          </VStack>
        </Section>
      {/if}

      {#if canEdit}
        <Section id="links" aria-labelledby="links-heading">
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2} id="links-heading">Linki publiczne</Heading>
              <Text type="supporting" color="secondary">
                Etykiety polskie są wymagane. Etykiety w innych językach są opcjonalne.
              </Text>
            </VStack>
            <form
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
              <Card>
                <VStack gap={4}>
                  {#each links as link, index (index)}
                    <VStack gap={3} class="link-fields">
                      <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
                        <TextInput
                          id={`link-label-${index}`}
                          label={`Etykieta · ${contentLocaleName(primaryContentLocale, language)}`}
                          value={link.label}
                          onChange={(value) => (link.label = value.slice(0, 200))}
                          isRequired
                        />
                        <TextInput
                          id={`link-url-${index}`}
                          label="URL"
                          value={link.url}
                          onChange={(value) => (link.url = value.slice(0, 2000))}
                          isRequired
                        />
                        {#each translationLocales as locale (locale)}
                          <TextInput
                            id={`link-${locale}-${index}`}
                            label={`Etykieta · ${contentLocaleName(locale, language)}`}
                            value={typeof link.translations?.[locale]?.label === 'string'
                              ? (link.translations[locale].label as string)
                              : ''}
                            onChange={(value) =>
                              (link.translations = {
                                ...link.translations,
                                [locale]: { label: value.slice(0, 200) }
                              })}
                          />
                        {/each}
                      </Grid>
                      <HStack>
                        <Button
                          type="button"
                          variant="secondary"
                          label="Usuń link"
                          onclick={() => (links = links.filter((_, i) => i !== index))}
                        >
                          {#snippet icon()}<Trash2 size={15} aria-hidden="true" />{/snippet}
                        </Button>
                      </HStack>
                    </VStack>
                  {/each}
                  <HStack gap={2} wrap="wrap" justify="end">
                    <Button
                      type="button"
                      variant="secondary"
                      label="Dodaj link"
                      isDisabled={links.length >= 50}
                      onclick={() => (links = [...links, { label: '', url: '' }])}
                    >
                      {#snippet icon()}{@render plusIcon()}{/snippet}
                    </Button>
                    <Button type="submit" label="Zapisz linki" isDisabled={busy}>
                      {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                    </Button>
                  </HStack>
                </VStack>
              </Card>
            </form>
          </VStack>
        </Section>
      {/if}
    </VStack>
  </VStack>
{/if}

<style>
  :global(.settings-layout) {
    display: grid !important;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: var(--spacing-8);
    align-items: start;
  }
  :global(.settings-main) {
    min-width: 0;
  }
  fieldset {
    margin: 0;
    padding: var(--spacing-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-element);
  }
  legend {
    padding-inline: var(--spacing-1);
    color: var(--color-text-secondary);
    font-size: var(--text-supporting-size);
  }
  :global(.link-fields) {
    padding-bottom: var(--spacing-4);
    border-bottom: 1px solid var(--color-border);
  }
  @media (max-width: 900px) {
    :global(.settings-layout) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
</style>
