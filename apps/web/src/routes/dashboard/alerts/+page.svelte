<script lang="ts">
  import { Megaphone, Pencil, Plus, Trash, X } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { api, resolveError } from '$lib/backend';
  import { toast } from 'svelte-sonner';
  import ms from 'ms';
  import {
    AlertDialog,
    Badge,
    Banner,
    Button,
    Card,
    Center,
    DateTimeInput,
    EmptyState,
    Grid,
    GridSpan,
    HStack,
    Heading,
    Icon,
    IconButton,
    Link,
    List,
    ListItem,
    NumberInput,
    Pagination,
    Selector,
    Spinner,
    Text,
    TextArea,
    TextInput,
    Token,
    VStack,
    type ISODateTimeString
  } from '@astryx-sv/core';

  type Alert = NonNullable<
    Awaited<ReturnType<typeof api.dashboard.admin.alerts.get>>['data']
  >['results'][number];

  let alerts = $state<Alert[]>([]);
  let pageCount = $state(0);
  let currentPage = $state(0);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  let creating = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let deletingId = $state<string | null>(null);
  let pendingDelete = $state<Alert | null>(null);
  let newAlert = $state(createInitialAlert());

  const colorOptions = [
    { value: 'neutral', label: 'Neutralny' },
    { value: 'info', label: 'Informacja' },
    { value: 'warning', label: 'Ostrzeżenie' },
    { value: 'danger', label: 'Zagrożenie' }
  ];

  function createInitialAlert() {
    return {
      title: '',
      description: '',
      color: 'neutral' as 'neutral' | 'info' | 'warning' | 'danger',
      startDate: new Date(),
      endDate: new Date(Date.now() + ms('7d')),
      priority: 0,
      link: ''
    };
  }

  async function fetchAlerts(page: number) {
    loading = true;
    loadError = null;

    const response = await api.dashboard.admin.alerts.get({
      query: { page }
    });

    if (response.error) {
      loadError = resolveError(response.error);
      toast.error(loadError);
      loading = false;
      return;
    }

    alerts = response.data.results;
    pageCount = response.data.pages;
    loading = false;

    const lastPage = Math.max(0, pageCount - 1);
    if (currentPage > lastPage) currentPage = lastPage;
  }

  $effect(() => {
    void fetchAlerts(currentPage);
  });

  function resetForm() {
    creating = false;
    editingId = null;
    newAlert = createInitialAlert();
  }

  function startEditing(alert: Alert) {
    newAlert = {
      title: alert.title,
      description: alert.description,
      color: alert.color,
      startDate: new Date(alert.startDate),
      endDate: new Date(alert.endDate),
      priority: alert.priority || 0,
      link: alert.link || ''
    };
    editingId = alert.id;
    creating = true;
  }

  async function saveAlert(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    saving = true;

    if (editingId) {
      const response = await api.dashboard.admin.alerts({ id: editingId }).put({
        ...newAlert,
        priority: newAlert.priority || undefined,
        link: newAlert.link
      });
      if (response.error) {
        toast.error(resolveError(response.error));
        saving = false;
        return;
      }
      toast.success('Pomyślnie zaktualizowano alert');
    } else {
      const response = await api.dashboard.admin.alerts.post({
        ...newAlert,
        priority: newAlert.priority || undefined,
        link: newAlert.link || undefined
      });
      if (response.error) {
        toast.error(resolveError(response.error));
        saving = false;
        return;
      }
      toast.success('Pomyślnie utworzono alert');
    }

    saving = false;
    resetForm();
    await fetchAlerts(currentPage);
  }

  function requestDelete(alert: Alert) {
    pendingDelete = alert;
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    deletingId = pendingDelete.id;
    const response = await api.dashboard.admin.alerts({ id: pendingDelete.id }).delete();
    if (response.error) {
      toast.error(resolveError(response.error));
      deletingId = null;
      pendingDelete = null;
      return;
    }

    toast.success('Usunięto alert');
    deletingId = null;
    pendingDelete = null;
    await fetchAlerts(currentPage);
  }

  function formatDateForInput(date: Date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16) as ISODateTimeString;
  }

  function formatLocalDate(date: Date | string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  }

  function alertStatus(alert: Alert) {
    const now = Date.now();
    if (new Date(alert.startDate).getTime() > now) return 'scheduled';
    if (new Date(alert.endDate).getTime() < now) return 'expired';
    return 'active';
  }

  function statusVariant(status: ReturnType<typeof alertStatus>) {
    if (status === 'active') return 'success' as const;
    if (status === 'scheduled') return 'info' as const;
    return 'neutral' as const;
  }

  function colorVariant(color: Alert['color']) {
    if (color === 'danger') return 'error' as const;
    if (color === 'warning') return 'warning' as const;
    if (color === 'info') return 'info' as const;
    return 'neutral' as const;
  }
</script>

{#snippet plusIcon()}
  <Icon icon={Plus} size="sm" />
{/snippet}

{#snippet closeIcon()}
  <Icon icon={X} size="sm" />
{/snippet}

{#snippet pencilIcon()}
  <Icon icon={Pencil} size="sm" />
{/snippet}

{#snippet trashIcon()}
  <Icon icon={Trash} size="sm" />
{/snippet}

{#snippet emptyIcon()}
  <Icon icon={Megaphone} size="lg" color="secondary" />
{/snippet}

{#snippet hero()}
  <HStack
    gap={8}
    justify="between"
    vAlign="end"
    wrap="wrap"
    class="border-line border-b pb-10 md:pb-14"
  >
    <VStack gap={4}>
      <Text type="code" color="accent" class="tracking-wider uppercase">Komunikaty</Text>
      <Heading level={1} type="display-1">Alerty</Heading>
      <Text type="large" color="secondary" class="max-w-2xl">
        Planuj i aktualizuj powiadomienia wyświetlane u góry publicznej witryny.
      </Text>
    </VStack>
    {#if !creating}
      <Button
        variant="primary"
        size="lg"
        label="Nowy alert"
        icon={plusIcon}
        onclick={() => (creating = true)}
      />
    {/if}
  </HStack>
{/snippet}

<Wrapper name="dashboard / alerts" {hero}>
  {#if creating}
    <VStack
      as="section"
      paddingBlock={10}
      class="border-line border-b"
      aria-labelledby="editor-heading"
    >
      <form onsubmit={saveAlert}>
        <Card padding={0} elevation="low">
          <HStack
            gap={4}
            justify="between"
            vAlign="center"
            padding={5}
            class="border-line border-b md:px-7"
          >
            <VStack gap={1}>
              <Text type="code" color="accent" class="tracking-wider uppercase">Edytor</Text>
              <Heading level={2} id="editor-heading">
                {editingId ? 'Edytuj alert' : 'Utwórz alert'}
              </Heading>
            </VStack>
            <IconButton
              variant="ghost"
              label="Zamknij edytor alertu"
              tooltip="Zamknij edytor"
              icon={closeIcon}
              onclick={resetForm}
              isDisabled={saving}
            />
          </HStack>

          <VStack gap={6} padding={5} class="md:p-7">
            <Grid columns={{ minWidth: 260, max: 2 }} gap={6}>
              <TextInput
                label="Tytuł"
                placeholder="Przerwa techniczna"
                bind:value={newAlert.title}
                aria-required="true"
                width="100%"
              />

              <Selector
                label="Styl wyświetlania"
                options={colorOptions}
                value={newAlert.color}
                onChange={(value: string | null) => {
                  if (value) newAlert.color = value as typeof newAlert.color;
                }}
                width="100%"
              />

              <DateTimeInput
                label="Początek"
                description="Twój czas lokalny"
                value={formatDateForInput(newAlert.startDate)}
                onChange={(value: ISODateTimeString | undefined) => {
                  if (value) newAlert.startDate = new Date(value);
                }}
                aria-required="true"
                width="100%"
              />

              <DateTimeInput
                label="Koniec"
                description="Twój czas lokalny"
                value={formatDateForInput(newAlert.endDate)}
                onChange={(value: ISODateTimeString | undefined) => {
                  if (value) newAlert.endDate = new Date(value);
                }}
                aria-required="true"
                width="100%"
              />

              <NumberInput
                label="Priorytet (opcjonalnie)"
                placeholder="0"
                step={1}
                value={newAlert.priority}
                onChange={(value: number | null) => (newAlert.priority = value ?? 0)}
                width="100%"
              />

              <TextInput
                label="Link (opcjonalnie)"
                placeholder="https://example.com"
                bind:value={newAlert.link}
                width="100%"
              />

              <GridSpan columns="full">
                <TextArea
                  label="Opis"
                  placeholder="Napisz, co powinni wiedzieć odwiedzający…"
                  bind:value={newAlert.description}
                  aria-required="true"
                  rows={5}
                  width="100%"
                />
              </GridSpan>
            </Grid>
          </VStack>

          <HStack
            gap={3}
            justify="end"
            padding={5}
            class="border-line flex-col-reverse border-t sm:flex-row md:px-7"
          >
            <Button variant="ghost" label="Anuluj" onclick={resetForm} isDisabled={saving} />
            <Button
              type="submit"
              variant="primary"
              label={saving ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Utwórz alert'}
              isLoading={saving}
            />
          </HStack>
        </Card>
      </form>
    </VStack>
  {/if}

  <VStack
    as="section"
    gap={8}
    paddingBlock={10}
    aria-labelledby="alert-list-heading"
    aria-busy={loading}
  >
    <HStack gap={4} justify="between" vAlign="end" wrap="wrap">
      <VStack gap={3}>
        <Text type="code" color="accent" class="tracking-wider uppercase">
          01 / Opublikowane wpisy
        </Text>
        <Heading level={2} id="alert-list-heading">Wszystkie alerty</Heading>
      </VStack>
      {#if !loading && !loadError}
        <Text type="code" color="secondary">
          Strona {currentPage + 1} / {Math.max(pageCount, 1)}
        </Text>
      {/if}
    </HStack>

    {#if loading}
      <Card variant="muted" padding={8}>
        <Center>
          <HStack gap={2} vAlign="center" role="status">
            <Spinner size="sm" />
            <Text type="code" color="secondary">Ładowanie alertów…</Text>
          </HStack>
        </Center>
      </Card>
    {:else if loadError}
      <Banner
        status="error"
        title="Nie udało się załadować alertów."
        description={loadError}
        collapsible={false}
      >
        {#snippet endContent()}
          <Button
            variant="secondary"
            size="sm"
            label="Spróbuj ponownie"
            onclick={() => void fetchAlerts(currentPage)}
          />
        {/snippet}
      </Banner>
    {:else if alerts.length === 0}
      <EmptyState
        title="Brak alertów na tej stronie"
        description="Utwórz alert, aby opublikować pierwszy komunikat."
        icon={emptyIcon}
      >
        {#snippet actions()}
          <Button
            variant="primary"
            label="Nowy alert"
            icon={plusIcon}
            onclick={() => (creating = true)}
          />
        {/snippet}
      </EmptyState>
    {:else}
      <Card padding={0}>
        <List hasDividers density="balanced">
          {#each alerts as alert (alert.id)}
            {@const status = alertStatus(alert)}
            <ListItem align="start">
              {#snippet label()}
                <VStack gap={3}>
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    <Badge variant={statusVariant(status)} label={status} />
                    <Badge variant={colorVariant(alert.color)} label={alert.color} />
                    {#if alert.priority}
                      <Token size="sm" color="gray" label={`Priorytet ${alert.priority}`} />
                    {/if}
                  </HStack>
                  <Heading level={3}>{alert.title}</Heading>
                  <Text type="code" color="secondary">
                    Od {formatLocalDate(alert.startDate)} do {formatLocalDate(alert.endDate)}
                  </Text>
                  <Text color="secondary" class="max-w-4xl wrap-anywhere whitespace-pre-wrap">
                    {alert.description}
                  </Text>
                  {#if alert.link}
                    <Link
                      href={alert.link}
                      type="supporting"
                      isExternalLink
                      target="_blank"
                      class="max-w-full wrap-anywhere"
                    >
                      {alert.link}
                    </Link>
                  {/if}
                </VStack>
              {/snippet}
              {#snippet endContent()}
                <HStack gap={1}>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label={`Edytuj ${alert.title}`}
                    tooltip="Edytuj"
                    icon={pencilIcon}
                    onclick={() => startEditing(alert)}
                    isDisabled={deletingId === alert.id}
                  />
                  <IconButton
                    variant="destructive"
                    size="sm"
                    label={`Usuń ${alert.title}`}
                    tooltip="Usuń"
                    icon={trashIcon}
                    onclick={() => requestDelete(alert)}
                    isDisabled={deletingId !== null}
                    isLoading={deletingId === alert.id}
                  />
                </HStack>
              {/snippet}
            </ListItem>
          {/each}
        </List>
      </Card>
    {/if}

    {#if !loading && !loadError && pageCount > 1}
      <HStack justify="center">
        <Pagination
          page={currentPage + 1}
          totalPages={pageCount}
          onChange={(page) => (currentPage = page - 1)}
          label="Stronicowanie alertów"
          size="sm"
        />
      </HStack>
    {/if}
  </VStack>

  <AlertDialog
    isOpen={pendingDelete !== null}
    onOpenChange={(open) => {
      if (!open) pendingDelete = null;
    }}
    title={`Usunąć „${pendingDelete?.title ?? ''}”?`}
    description="Tej operacji nie można cofnąć."
    actionLabel="Usuń alert"
    cancelLabel="Anuluj"
    actionVariant="destructive"
    isActionLoading={deletingId !== null}
    onAction={() => void confirmDelete()}
  />
</Wrapper>
