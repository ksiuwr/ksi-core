<script lang="ts">
  import { RefreshCw, TableProperties } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { api } from '$lib/backend';
  import { toast } from 'svelte-sonner';
  import {
    Banner,
    Button,
    Card,
    Center,
    Collapsible,
    EmptyState,
    Grid,
    HStack,
    Heading,
    Icon,
    List,
    ListItem,
    Spinner,
    Text,
    VStack
  } from '@astryx-sv/core';

  type CachedMap = NonNullable<Awaited<ReturnType<typeof api.dashboard.admin.s3cache.get>>['data']>;

  let cachedMap = $state<CachedMap | null>(null);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let refreshingKeys = $state<string[]>([]);

  let cacheEntries = $derived(
    cachedMap ? Object.entries(cachedMap).sort(([left], [right]) => left.localeCompare(right)) : []
  );

  $effect(() => {
    void fetchCache();
  });

  function resolveCacheError(error: { value: unknown }) {
    if (typeof error.value === 'string') return error.value;
    if (
      typeof error.value === 'object' &&
      error.value !== null &&
      'message' in error.value &&
      typeof error.value.message === 'string'
    ) {
      return error.value.message;
    }
    return 'Wystąpił nieznany błąd.';
  }

  async function fetchCache(showLoading = true) {
    if (showLoading) loading = true;
    loadError = null;
    const response = await api.dashboard.admin.s3cache.get();

    if (response.error) {
      loadError = resolveCacheError(response.error);
      toast.error(loadError);
      loading = false;
      return;
    }

    cachedMap = response.data;
    loading = false;
  }

  async function refetch(key: string) {
    if (refreshingKeys.includes(key)) return;
    refreshingKeys = [...refreshingKeys, key];

    const response = await api.dashboard.admin.s3cache({ id: key }).post();
    if (response.error) {
      toast.error(resolveCacheError(response.error));
      refreshingKeys = refreshingKeys.filter((item) => item !== key);
      return;
    }

    await fetchCache(false);
    refreshingKeys = refreshingKeys.filter((item) => item !== key);
    toast.success(`Odświeżono klucz pamięci podręcznej „${key}”`);
  }

  function formatLocalDate(date: Date | number | string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  }
</script>

{#snippet refreshIcon()}
  <Icon icon={RefreshCw} size="sm" />
{/snippet}

{#snippet emptyIcon()}
  <Icon icon={TableProperties} size="lg" color="secondary" />
{/snippet}

{#snippet hero()}
  <VStack as="header" gap={4} class="border-line border-b pb-10 md:pb-14">
    <Text type="code" color="accent" class="tracking-wider uppercase">
      Operacje na magazynie danych
    </Text>
    <Heading level={1} type="display-1">Pamięć podręczna S3</Heading>
    <Text type="large" color="secondary" class="max-w-3xl">
      Witryna zapisuje w pamięci podręcznej listy adresów URL obiektów z Cloudflare R2, aby uniknąć
      wielokrotnego skanowania magazynu. Przejrzyj poniżej każdą zapisaną grupę lub odśwież klucz po
      zmianie zawartości jego zasobnika.
    </Text>
  </VStack>
{/snippet}

<Wrapper name="dashboard / s3 cache" {hero}>
  <VStack
    as="section"
    gap={8}
    paddingBlock={10}
    aria-labelledby="cache-list-heading"
    aria-busy={loading}
  >
    <HStack gap={4} justify="between" vAlign="end" wrap="wrap">
      <VStack gap={3}>
        <Text type="code" color="accent" class="tracking-wider uppercase">
          01 / Grupy w pamięci podręcznej
        </Text>
        <Heading level={2} id="cache-list-heading">Listy obiektów</Heading>
      </VStack>
      {#if !loading && !loadError}
        <Text type="code" color="secondary">
          Zapisano w pamięci podręcznej: {cacheEntries.length}
        </Text>
      {/if}
    </HStack>

    {#if loading}
      <Card variant="muted" padding={8}>
        <Center>
          <HStack gap={2} vAlign="center" role="status">
            <Spinner size="sm" />
            <Text type="code" color="secondary">Ładowanie list obiektów z pamięci podręcznej…</Text>
          </HStack>
        </Center>
      </Card>
    {:else if loadError}
      <Banner
        status="error"
        title="Nie udało się załadować pamięci podręcznej S3."
        description={loadError}
        collapsible={false}
      >
        {#snippet endContent()}
          <Button
            variant="secondary"
            size="sm"
            label="Spróbuj ponownie"
            onclick={() => void fetchCache()}
          />
        {/snippet}
      </Banner>
    {:else if cacheEntries.length === 0}
      <EmptyState
        title="Nie znaleziono kluczy pamięci podręcznej"
        description="Listy obiektów pojawią się tutaj po zapisaniu ich w pamięci podręcznej."
        icon={emptyIcon}
      />
    {:else}
      <Grid columns={{ minWidth: 360, max: 2 }} gap={5}>
        {#each cacheEntries as [key, cache] (key)}
          {@const refreshing = refreshingKeys.includes(key)}
          <Card padding={0} elevation="low" class="min-w-0">
            <VStack gap={5} padding={5} class="border-line border-b md:p-6">
              <HStack gap={5} justify="between" vAlign="start" wrap="wrap">
                <VStack gap={2} class="min-w-0 flex-1">
                  <Text type="code" color="secondary" class="tracking-wider uppercase">
                    Klucz pamięci podręcznej
                  </Text>
                  <Heading level={3} class="wrap-anywhere">{key}</Heading>
                  <Text type="supporting" color="secondary">
                    Zaktualizowano {formatLocalDate(cache.time)}
                  </Text>
                </VStack>
                <Button
                  variant="secondary"
                  size="sm"
                  label={refreshing ? 'Odświeżanie…' : 'Odśwież'}
                  icon={refreshIcon}
                  isLoading={refreshing}
                  onclick={() => void refetch(key)}
                />
              </HStack>
            </VStack>

            <VStack padding={5} class="md:px-6">
              <Collapsible
                trigger={`${cache.data.length} ${cache.data.length === 1 ? 'object URL' : 'object URLs'}`}
                defaultIsOpen={false}
              >
                <List hasDividers density="compact">
                  {#each [...cache.data].sort( (left, right) => left.localeCompare(right) ) as url (url)}
                    <ListItem href={url} target="_blank" rel="noopener noreferrer">
                      {#snippet label()}
                        <Text type="code">{url}</Text>
                      {/snippet}
                    </ListItem>
                  {:else}
                    <ListItem
                      label="Ten klucz pamięci podręcznej nie zawiera żadnych adresów URL."
                    />
                  {/each}
                </List>
              </Collapsible>
            </VStack>
          </Card>
        {/each}
      </Grid>
    {/if}
  </VStack>
</Wrapper>
