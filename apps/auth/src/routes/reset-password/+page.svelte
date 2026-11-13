<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { createAuthClient } from 'better-auth/svelte';
  import {
    Banner,
    Button,
    Card,
    Heading,
    HStack,
    Link,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
  import { preferences, setLanguage } from '@ksi-core/ui/platform/preferences';

  const language = $derived(preferences.language);

  let password = $state(''),
    message = $state(''),
    busy = $state(false),
    changed = $state(false);
  const token = $derived(page.url.searchParams.get('token') ?? '');
  let client: ReturnType<typeof createAuthClient>;
  onMount(() => {
    client = createAuthClient({ baseURL: location.origin, basePath: '/api/auth' });
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      const result = await client.resetPassword({ newPassword: password, token });
      changed = !result.error;
      message = result.error?.message ?? 'Hasło zmienione. Możesz się zalogować.';
    } catch {
      message = 'Nie można połączyć się z serwerem.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Nowe hasło · KSI</title></svelte:head>

<main class="auth-shell">
  <VStack width="min(100%, 460px)" gap={6}>
    <HStack justify="between" vAlign="center" gap={3}>
      <Link href="/" type="label" weight="bold">
        KSI <Text as="span" type="supporting" color="secondary">/ core</Text>
      </Link>
      <HStack gap={2} vAlign="center">
        <ThemeSelector />
        <Button
          variant="secondary"
          size="sm"
          label={language === 'pl' ? 'EN' : 'PL'}
          tooltip="Zmień język"
          onclick={() => setLanguage(language === 'pl' ? 'en-us' : 'pl')}
        />
      </HStack>
    </HStack>

    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={2}>
          <Heading level={1}>Nowe hasło</Heading>
          <Text color="secondary">Wybierz nowe hasło dla swojego konta KSI.</Text>
        </VStack>

        {#if !token}
          <Banner
            status="error"
            title="Brak linku odzyskiwania. Poproś o nowy link na stronie logowania."
          />
        {:else if !changed}
          <form onsubmit={submit}>
            <VStack gap={3}>
              <TextInput
                label="Hasło"
                type="password"
                isRequired
                isDisabled={busy}
                value={password}
                onChange={(value) => (password = value)}
              />
              <Button
                type="submit"
                variant="primary"
                label={busy ? 'Zapisywanie…' : 'Zapisz hasło'}
                isLoading={busy}
                width="100%"
              />
            </VStack>
          </form>
        {/if}

        {#if message}
          <Banner status="info" title={message} />
        {/if}

        <Button variant="secondary" label="Wróć do logowania" href="/" width="100%" />
      </VStack>
    </Card>

    <HStack justify="between" vAlign="center" gap={2} wrap="wrap">
      <Link href="/" type="supporting" color="secondary">Wróć na stronę KSI</Link>
      <Text type="supporting" color="secondary">KSI · Uniwersytet Wrocławski</Text>
      <Text type="supporting" color="secondary">v{import.meta.env.PUBLIC_APP_VERSION}</Text>
      <Link
        href={import.meta.env.PUBLIC_COMMIT_HASH
          ? `https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`
          : `https://github.com/ksiuwr/ksi-core`}
        type="supporting"
        color="secondary"
        isExternalLink
      >
        {import.meta.env.PUBLIC_COMMIT_HASH?.slice(0, 7) || 'Kod źródłowy'}
      </Link>
    </HStack>
  </VStack>
</main>
