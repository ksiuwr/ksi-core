<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime } from 'shared/format';
  import {
    Banner,
    Button,
    Card,
    Code,
    EmptyState,
    Heading,
    HStack,
    Link,
    List,
    ListItem,
    Spinner,
    Text,
    VStack
  } from '@astryx-sv/core';
  import { KeyRound } from '@lucide/svelte';

  let { projectSlug }: { projectSlug: string } = $props();
  let credentials = $state<
    {
      previewId: string;
      branch: string;
      commit: string;
      previewUrl: string;
      accounts: { email: string; password: string }[];
      updatedAt: string;
    }[]
  >([]);
  let loading = $state(true);
  let error = $state('');
  async function load() {
    loading = true;
    error = '';
    try {
      const response = await fetch(
        `/api/platform/projects/by-slug/${encodeURIComponent(projectSlug)}/previews`
      );
      const result = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        const code =
          typeof result === 'object' && result !== null && 'code' in result ? result.code : null;
        throw new Error(
          typeof code === 'string' ? code : 'Nie udało się wczytać danych logowania podglądu'
        );
      }
      if (!Array.isArray(result))
        throw new Error('Nie udało się wczytać danych logowania podglądu');
      credentials = result;
    } catch (cause) {
      error =
        cause instanceof Error && cause.message === 'FORBIDDEN'
          ? 'Nie należysz do grupy projektu z dostępem do danych logowania podglądu.'
          : cause instanceof Error
            ? cause.message
            : 'Nie udało się wczytać danych logowania podglądu';
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    void load();
  });
</script>

<HStack gap={4} vAlign="center" justify="between" wrap="wrap">
  <Heading level={1}>Dane logowania podglądu</Heading>
  <Button
    variant="secondary"
    label="Odśwież"
    isDisabled={loading}
    isLoading={loading}
    onclick={() => void load()}
  />
</HStack>

{#if loading}
  <HStack gap={2} vAlign="center">
    <Spinner size="sm" />
    <Text color="secondary">Wczytywanie danych logowania…</Text>
  </HStack>
{:else if error}
  <Banner status="error" title={error} role="alert" />
{:else if !credentials.length}
  <Card>
    <EmptyState
      title="Brak danych logowania dla podglądów"
      description="Dane logowania pojawią się tutaj po zakończeniu wdrażania podglądu."
    >
      {#snippet icon()}<KeyRound size={28} aria-hidden="true" />{/snippet}
    </EmptyState>
  </Card>
{:else}
  <VStack gap={4}>
    {#each credentials as deployment (deployment.previewId)}
      <Card>
        <VStack gap={3}>
          <Heading level={2}>{deployment.branch}</Heading>
          <Text>
            <Link href={deployment.previewUrl} isExternalLink>{deployment.previewUrl}</Link>
          </Text>
          <Text type="supporting" color="secondary">
            Commit <Code>{deployment.commit.slice(0, 12)}</Code> · Zaktualizowano
            {formatDateTime(deployment.updatedAt, preferences.language)}
          </Text>
          <List hasDividers>
            {#each deployment.accounts as account (account.email)}
              <ListItem label={account.email}>
                {#snippet description()}
                  <Text type="code">{account.password}</Text>
                {/snippet}
              </ListItem>
            {/each}
          </List>
          <Text type="supporting" color="secondary">
            To wspólne konta testowe dla tego podglądu. Nie udostępniaj haseł poza grupą projektu.
          </Text>
        </VStack>
      </Card>
    {/each}
  </VStack>
{/if}
