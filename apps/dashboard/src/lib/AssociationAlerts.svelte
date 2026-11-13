<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import {
    ArrowUpRight,
    Check,
    Info,
    Megaphone,
    OctagonAlert,
    Pencil,
    Plus,
    Save,
    Trash2,
    TriangleAlert
  } from '@lucide/svelte';
  import DateTimeRangePicker from '@ksi-core/ui/platform/DateTimeRangePicker.svelte';
  import type { AssociationAlert } from 'shared/types';
  import { preferences } from './preferences.svelte';
  import { api, errorMessage } from './api';
  import SettingsNav from './SettingsNav.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import {
    localizeContent,
    primaryContentLocale,
    type ContentLocale,
    type ContentTranslations as TranslationData
  } from 'shared/content-locales';
  import {
    Badge,
    Banner,
    Button,
    Card,
    EmptyState,
    Heading,
    HStack,
    IconButton,
    List,
    ListItem,
    NumberInput,
    Section,
    Selector,
    Text,
    TextArea,
    TextInput,
    VStack
  } from '@astryx-sv/core';

  let {
    alerts,
    page,
    websiteOrigin
  }: {
    alerts: { results: AssociationAlert[]; pages: number };
    page: number;
    websiteOrigin: string;
  } = $props();

  let editing = $state(false);
  let editingId = $state<string | null>(null);
  let contentLocale = $state<ContentLocale>(primaryContentLocale);
  let translationDraft = $state<Record<string, string>>({});
  let translations = $state<TranslationData>({});
  let version = $state<number>();
  let translationEditor = $state<ContentTranslations>();
  let title = $state('');
  let description = $state('');
  let link = $state('');
  let color = $state<AssociationAlert['color']>('info');
  let priority = $state(0);
  let start = $state('');
  let end = $state('');
  let busy = $state(false);
  let error = $state('');
  let saved = $state(false);
  let removing = $state<AssociationAlert | null>(null);
  let now = $state(Date.now());
  const uid = $props.id();
  const Icon = $derived(
    { info: Info, danger: OctagonAlert, warning: TriangleAlert, neutral: Megaphone }[color]
  );
  const preview = $derived(
    localizeContent(
      {
        title,
        description,
        link,
        translations:
          contentLocale === primaryContentLocale ? {} : { [contentLocale]: translationDraft }
      },
      contentLocale
    )
  );
  const previewStatus = $derived(
    color === 'danger' ? 'error' : color === 'warning' ? 'warning' : 'info'
  );

  type AlertTextField = 'title' | 'description' | 'link';
  function localized(key: AlertTextField) {
    const primary = { title, description, link }[key];
    return contentLocale === primaryContentLocale ? primary : (translationDraft[key] ?? '');
  }
  function setLocalized(key: AlertTextField, value: string) {
    const limit = key === 'title' ? 200 : 2000;
    const next = value.slice(0, limit);
    if (contentLocale !== primaryContentLocale) translationDraft[key] = next;
    else if (key === 'title') title = next;
    else if (key === 'description') description = next;
    else link = next;
  }
  async function translationSaved(result: AssociationAlert) {
    translations = result.translations;
    version = result.version;
    await invalidateAll();
  }

  const validInterval = $derived(!!start && !!end && new Date(end) > new Date(start));

  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 30000);
    return () => clearInterval(timer);
  });

  function localDate(raw: string | Date) {
    const date = new Date(raw);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function formatDate(raw: string) {
    return new Intl.DateTimeFormat(preferences.language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(raw));
  }

  async function edit(alert?: AssociationAlert) {
    editingId = alert?.id ?? null;
    contentLocale = primaryContentLocale;
    translationDraft = {};
    translations = alert?.translations ?? {};
    version = alert?.version;
    title = alert?.title ?? '';
    description = alert?.description ?? '';
    link = alert?.link ?? '';
    color = alert?.color ?? 'info';
    priority = alert?.priority ?? 0;
    start = localDate(alert?.startDate ?? new Date());
    end = localDate(alert?.endDate ?? new Date(Date.now() + 7 * 86400000));
    error = '';
    saved = false;
    editing = true;
    await tick();
    document.getElementById(`${uid}-title`)?.focus();
  }

  function saveShortcut(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !event.ctrlKey || event.isComposing) return;
    const form = event.target instanceof Element ? event.target.closest('form.alert-editor') : null;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (busy || event.repeat) return;
    if (contentLocale === primaryContentLocale) form.requestSubmit();
    else void translationEditor?.saveTranslation();
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (contentLocale !== primaryContentLocale || busy || !validInterval || !title.trim()) return;
    busy = true;
    error = '';
    saved = false;
    try {
      await api(
        `/dashboard/admin/alerts${editingId ? `/${encodeURIComponent(editingId)}` : ''}`,
        editingId ? 'PUT' : 'POST',
        {
          version,
          title: title.trim(),
          description: description.trim(),
          link: link.trim(),
          color,
          priority,
          startDate: new Date(start).toISOString(),
          endDate: new Date(end).toISOString()
        }
      );
      editing = false;
      saved = true;
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!removing || busy) return;
    busy = true;
    error = '';
    saved = false;
    try {
      await api(`/dashboard/admin/alerts/${encodeURIComponent(removing.id)}`, 'DELETE');
      if (editingId === removing.id) editing = false;
      removing = null;
      await invalidateAll();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

{#snippet alertIcon()}<Icon size={18} aria-hidden="true" />{/snippet}
{#snippet alertArrow()}<ArrowUpRight size={17} aria-hidden="true" />{/snippet}

<svelte:window onkeydown={saveShortcut} />

<HStack gap={4} vAlign="start" justify="between" wrap="wrap">
  <VStack gap={1}>
    <Heading level={1}>Ustawienia koła</Heading>
    <Text color="secondary">Zarządzaj ogłoszeniami na stronie publicznej.</Text>
  </VStack>
  <Button
    variant="secondary"
    label="Zobacz stronę"
    href={websiteOrigin}
    target="_blank"
    rel="noopener noreferrer"
  >
    {#snippet icon()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
  </Button>
</HStack>

<VStack gap={6} class="settings-layout">
  <SettingsNav
    label="Ustawienia koła"
    items={[{ id: 'alerts', label: 'Alerty na stronie', icon: Megaphone }]}
  />
  <VStack gap={4} class="settings-main">
    <Section id="alerts" aria-labelledby={`${uid}-heading`}>
      <VStack gap={4}>
        <HStack gap={4} vAlign="start" justify="between" wrap="wrap">
          <VStack gap={1}>
            <Heading level={2} id={`${uid}-heading`}>Alerty na stronie</Heading>
            <Text type="supporting" color="secondary">
              Alerty są widoczne tylko w wybranym przedziale czasu. Gdy przedziały się nakładają,
              wygrywa najwyższy priorytet; przy równym priorytecie wyświetlany jest alert z
              późniejszą datą rozpoczęcia.
            </Text>
          </VStack>
          <Button label="Nowy alert" isDisabled={busy} onclick={() => void edit()}>
            {#snippet icon()}<Plus size={15} aria-hidden="true" />{/snippet}
          </Button>
        </HStack>

        {#if error}
          <Banner
            status="error"
            role="alert"
            title={error === 'INVALID_ALERT_INTERVAL'
              ? 'Koniec musi przypadać po początku.'
              : error === 'REVISION_CONFLICT'
                ? 'Treść została zmieniona. Odśwież przed zapisaniem.'
                : 'Nie udało się zapisać zmian. Sprawdź link i spróbuj ponownie.'}
          />
        {/if}
        {#if saved}
          <Banner status="success" title="Zapisano alert." role="status" />
        {/if}

        {#if editing}
          <Card>
            <form class="alert-editor" onsubmit={save}>
              <VStack gap={3}>
                <Heading level={3}>{editingId ? 'Edytuj alert' : 'Utwórz alert'}</Heading>
                {#if editingId}
                  {#key editingId}
                    <ContentTranslations
                      bind:this={translationEditor}
                      kind="alert"
                      id={editingId}
                      {version}
                      {translations}
                      baseline={{ title, description, link }}
                      bind:selected={contentLocale}
                      bind:draft={translationDraft}
                      onsaved={translationSaved}
                    />
                  {/key}
                {:else}
                  <Text type="supporting" color="secondary">
                    Zapisz polską wersję alertu przed dodaniem tłumaczeń.
                  </Text>
                {/if}
                <fieldset disabled={busy}>
                  <VStack gap={3}>
                    <TextInput
                      id={`${uid}-title`}
                      label="Tytuł"
                      value={localized('title')}
                      onChange={(value) => setLocalized('title', value)}
                      isRequired={contentLocale === primaryContentLocale}
                    />
                    <TextArea
                      id={`${uid}-content`}
                      label="Treść"
                      rows={3}
                      value={localized('description')}
                      onChange={(value) => setLocalized('description', value)}
                    />
                    {#if contentLocale === primaryContentLocale}
                      <HStack gap={3} wrap="wrap">
                        <Selector
                          label="Styl"
                          value={color}
                          options={[
                            { value: 'info', label: 'Informacja' },
                            { value: 'danger', label: 'Niebezpieczeństwo' },
                            { value: 'warning', label: 'Ostrzeżenie' },
                            { value: 'neutral', label: 'Neutralny' }
                          ]}
                          isDisabled={busy}
                          onChange={(value: string) => (color = value as AssociationAlert['color'])}
                        />
                        <NumberInput
                          label="Priorytet"
                          value={priority}
                          isRequired
                          min={-2147483648}
                          max={2147483647}
                          step={1}
                          onChange={(value: number | null) => (priority = value ?? 0)}
                        />
                      </HStack>
                    {/if}
                    <TextInput
                      id={`${uid}-link`}
                      label="Link (opcjonalny)"
                      value={localized('link')}
                      onChange={(value) => setLocalized('link', value)}
                      placeholder="https://… or /projects"
                      description={contentLocale === primaryContentLocale
                        ? 'Użyj ścieżki strony, adresu HTTP(S) lub linku mailto. Pozostaw puste, aby baner nie zawierał linku.'
                        : 'Pozostaw puste, aby użyć polskiego linku.'}
                    />
                    {#if contentLocale === primaryContentLocale}
                      <DateTimeRangePicker bind:start bind:end disabled={busy} />
                      <Text type="supporting" color="secondary">
                        Daty są wyświetlane w Twojej lokalnej strefie czasowej i zapisywane jako
                        jednoznaczne momenty w czasie.
                      </Text>
                    {/if}
                    <VStack gap={1}>
                      <Text type="label" weight="medium">Podgląd</Text>
                      <Banner
                        status={previewStatus}
                        title={preview.title.trim() || 'Tytuł Twojego alertu'}
                        description={preview.description}
                        icon={alertIcon}
                        endContent={preview.link.trim() ? alertArrow : undefined}
                      />
                    </VStack>
                  </VStack>
                </fieldset>
                <HStack gap={2} justify="end" wrap="wrap">
                  <Button
                    type="button"
                    variant="secondary"
                    label="Anuluj"
                    isDisabled={busy}
                    onclick={() => (editing = false)}
                  />
                  {#if contentLocale === primaryContentLocale}
                    <Button
                      type="submit"
                      label={busy ? 'Zapisywanie…' : 'Zapisz alert'}
                      aria-keyshortcuts="Control+Enter"
                      isDisabled={busy || !validInterval || !title.trim()}
                      isLoading={busy}
                    >
                      {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                    </Button>
                  {/if}
                </HStack>
              </VStack>
            </form>
          </Card>
        {/if}

        <Card padding={0}>
          {#if alerts.results.length}
            <List hasDividers edge="bleed">
              {#each alerts.results as alert (alert.id)}
                <ListItem>
                  {#snippet label()}
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Text as="span" weight="semibold">{alert.title}</Text>
                      <Badge
                        label={new Date(alert.startDate).getTime() > now
                          ? 'Zaplanowany'
                          : new Date(alert.endDate).getTime() <= now
                            ? 'Zakończony'
                            : 'Aktywny okres'}
                        variant={new Date(alert.startDate).getTime() > now
                          ? 'neutral'
                          : new Date(alert.endDate).getTime() <= now
                            ? 'warning'
                            : 'success'}
                      />
                      <Badge
                        label={alert.color === 'info'
                          ? 'Informacja'
                          : alert.color === 'danger'
                            ? 'Niebezpieczeństwo'
                            : alert.color === 'warning'
                              ? 'Ostrzeżenie'
                              : 'Neutralny'}
                        variant={alert.color === 'danger'
                          ? 'error'
                          : alert.color === 'warning'
                            ? 'warning'
                            : alert.color === 'info'
                              ? 'info'
                              : 'neutral'}
                      />
                    </HStack>
                  {/snippet}
                  {#snippet description()}
                    <VStack gap={1}>
                      {#if alert.description}
                        <Text type="supporting" color="secondary">{alert.description}</Text>
                      {/if}
                      <HStack gap={1} wrap="wrap">
                        <Text type="supporting" color="secondary">
                          <time datetime={alert.startDate}>{formatDate(alert.startDate)}</time>
                          <span aria-hidden="true"> → </span>
                          <time datetime={alert.endDate}>{formatDate(alert.endDate)}</time>
                        </Text>
                      </HStack>
                      <Text type="supporting" color="secondary">
                        Priorytet: {alert.priority ?? 0}{#if alert.link}
                          · {alert.link}{/if}
                      </Text>
                    </VStack>
                  {/snippet}
                  {#snippet endContent()}
                    <HStack gap={1}>
                      <Button
                        variant="secondary"
                        size="sm"
                        label="Edytuj"
                        isDisabled={busy}
                        onclick={() => void edit(alert)}
                      >
                        {#snippet icon()}<Pencil size={14} aria-hidden="true" />{/snippet}
                      </Button>
                      <IconButton
                        label="Usuń alert"
                        tooltip="Usuń alert"
                        variant="destructive"
                        size="sm"
                        isDisabled={busy}
                        onclick={() => (removing = alert)}
                      >
                        {#snippet icon()}<Trash2 size={14} aria-hidden="true" />{/snippet}
                      </IconButton>
                    </HStack>
                  {/snippet}
                </ListItem>
              {/each}
            </List>
          {:else}
            <EmptyState
              title="Brak alertów"
              description="Utwórz ogłoszenie i wybierz, kiedy pojawi się na stronie."
            >
              {#snippet icon()}<Megaphone size={24} aria-hidden="true" />{/snippet}
            </EmptyState>
          {/if}
        </Card>

        {#if alerts.pages > 1}
          <HStack gap={3} vAlign="center" justify="end" as="nav" aria-label="Strony alertów">
            {#if page > 0}
              <Button variant="secondary" label="Poprzednia" href={`?page=${page - 1}`} />
            {/if}
            <Text type="supporting" color="secondary">{page + 1} / {alerts.pages}</Text>
            {#if page + 1 < alerts.pages}
              <Button variant="secondary" label="Następna" href={`?page=${page + 1}`} />
            {/if}
          </HStack>
        {/if}
      </VStack>
    </Section>
  </VStack>
</VStack>

<ConfirmDialog
  open={!!removing}
  title="Usunąć alert?"
  message="Ogłoszenie zostanie usunięte z harmonogramu i strony publicznej."
  {busy}
  onconfirm={() => void remove()}
  onclose={() => (removing = null)}
/>

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
    padding: 0;
    border: 0;
    min-width: 0;
  }
  @media (max-width: 900px) {
    :global(.settings-layout) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
</style>
