<script lang="ts">
  import { onMount } from 'svelte';
  import { createAuthClient } from 'better-auth/svelte';
  import {} from '@lucide/svelte';
  import {
    Banner,
    Button,
    Card,
    CheckboxInput,
    Divider,
    Heading,
    HStack,
    Link,
    SegmentedControl,
    SegmentedControlItem,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
  import { preferences, setLanguage } from '@ksi-core/ui/platform/preferences';

  let { data } = $props();

  const language = $derived(preferences.language);
  let mode = $state<'login' | 'signup' | 'reset'>('login');
  let email = $state(''),
    password = $state(''),
    name = $state(''),
    consent = $state(false),
    busy = $state(false),
    message = $state('');
  let hints = $state<{ email: string; name: string }[]>([]);
  let client: ReturnType<typeof createAuthClient>;

  onMount(() => {
    client = createAuthClient({ baseURL: location.origin, basePath: '/api/auth' });
    try {
      const stored = JSON.parse(localStorage.getItem('ksi-account-hints') ?? '[]');
      hints = Array.isArray(stored)
        ? stored
            .filter((h) => h && typeof h.email === 'string' && typeof h.name === 'string')
            .slice(0, 5)
        : [];
    } catch {
      hints = [];
    }
  });

  function callback() {
    return location.search
      ? `${location.origin}/sso${location.search}`
      : `${data.dashboardOrigin}/login`;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    message = '';
    try {
      const result =
        mode === 'signup'
          ? await client.signUp.email({ email, password, name })
          : mode === 'reset'
            ? await client.requestPasswordReset({
                email,
                redirectTo: `${location.origin}/reset-password`
              })
            : await client.signIn.email({ email, password });

      if (result.error) {
        message = result.error.message ?? 'Nie udało się zalogować.';
      } else if (mode !== 'login') {
        message = 'Sprawdź skrzynkę e-mail.';
      } else {
        if (consent) {
          hints = [{ email, name: name || email }, ...hints.filter((h) => h.email !== email)].slice(
            0,
            5
          );
          localStorage.setItem('ksi-account-hints', JSON.stringify(hints));
        }
        location.assign(callback());
      }
    } catch {
      message = 'Nie można połączyć się z serwerem.';
    } finally {
      busy = false;
    }
  }

  async function provider(p: 'github' | 'google') {
    busy = true;
    message = '';
    try {
      const result = await client.signIn.social({ provider: p, callbackURL: callback() });
      if (result.error) {
        message = result.error.message ?? 'Nie udało się zalogować.';
        busy = false;
      }
    } catch {
      message = 'Nie można połączyć się z serwerem.';
      busy = false;
    }
  }

  function forget(e: string) {
    hints = hints.filter((h) => h.email !== e);
    localStorage.setItem('ksi-account-hints', JSON.stringify(hints));
  }

  const modeLabel = $derived(
    mode === 'signup' ? 'Nowe konto' : mode === 'reset' ? 'Wyślij link' : 'Logowanie'
  );

  const titleLabel = $derived(
    mode === 'signup' ? 'Dołącz do KSI' : mode === 'reset' ? 'Odzyskaj dostęp' : 'Witaj w KSI'
  );
</script>

<svelte:head>
  <title>Logowanie · KSI</title>
</svelte:head>

<main class="auth-shell">
  <VStack width="min(100%, 460px)" gap={6}>
    <HStack justify="between" vAlign="center" gap={3}>
      <Link href={data.websiteOrigin} type="label" weight="bold">
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
        {#if data.user}
          <Heading level={1}>{titleLabel}</Heading>
          <Text color="secondary">
            Jesteś zalogowany(a) jako <strong>{data.user.name || data.user.email}</strong>.
          </Text>
          <VStack gap={2}>
            <Button href={data.dashboardOrigin} variant="primary" label="Przejdź do Panelu" />
            <Button
              variant="secondary"
              label="Wyloguj się"
              isDisabled={busy}
              clickAction={async () => {
                busy = true;
                await client.signOut();
                location.reload();
              }}
            />
          </VStack>
        {:else}
          <VStack gap={2}>
            <Heading level={1}>{titleLabel}</Heading>
            <Text color="secondary">Jedno konto. Wszystkie projekty i rozmowy KSI.</Text>
          </VStack>

          {#if mode !== 'reset'}
            <SegmentedControl
              value={mode}
              label="Opcje konta"
              layout="fill"
              onChange={(value) => {
                mode = value as 'login' | 'signup';
                message = '';
              }}
            >
              <SegmentedControlItem value="login" label="Logowanie" />
              <SegmentedControlItem value="signup" label="Nowe konto" />
            </SegmentedControl>
          {/if}

          {#if hints.length && mode === 'login'}
            <VStack gap={2}>
              <Text type="supporting" color="secondary">Zapamiętane konta</Text>
              {#each hints as hint (hint.email)}
                <HStack justify="between" vAlign="center" gap={2}>
                  <Button
                    variant="ghost"
                    label={hint.name}
                    isDisabled={busy}
                    onclick={() => {
                      email = hint.email;
                      document.getElementById('auth-password')?.focus();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Zapomnij"
                    isDisabled={busy}
                    onclick={() => forget(hint.email)}
                  />
                </HStack>
              {/each}
            </VStack>
          {/if}

          {#if mode !== 'reset'}
            <VStack gap={2}>
              <Button
                variant="secondary"
                label="Kontynuuj z GitHub"
                isDisabled={busy}
                width="100%"
                onclick={() => provider('github')}
              />
              <Button
                variant="secondary"
                label="Kontynuuj z Google"
                isDisabled={busy}
                width="100%"
                onclick={() => provider('google')}
              />
            </VStack>
            <Divider label="lub użyj adresu e-mail" />
          {/if}

          <form onsubmit={submit}>
            <VStack gap={3}>
              {#if mode === 'signup'}
                <TextInput
                  label="Pełne imię i nazwisko"
                  value={name}
                  placeholder="Anna Kowalska"
                  isRequired
                  isDisabled={busy}
                  onChange={(value) => (name = value)}
                />
              {/if}
              <TextInput
                label="E-mail"
                type="email"
                value={email}
                placeholder="anna@example.com"
                isRequired
                isDisabled={busy}
                onChange={(value) => (email = value)}
              />
              {#if mode !== 'reset'}
                <VStack gap={1}>
                  <TextInput
                    label="Hasło"
                    type="password"
                    value={password}
                    isRequired
                    isDisabled={busy}
                    width="100%"
                    onChange={(value) => (password = value)}
                  />
                  {#if mode === 'login'}
                    <HStack justify="end">
                      <Button
                        variant="ghost"
                        size="sm"
                        label="Nie pamiętam hasła"
                        isDisabled={busy}
                        onclick={() => {
                          mode = 'reset';
                          message = '';
                        }}
                      />
                    </HStack>
                  {/if}
                </VStack>
              {/if}
              {#if mode === 'login'}
                <CheckboxInput
                  label="Zapamiętaj konto na tym urządzeniu"
                  value={consent}
                  isDisabled={busy}
                  onChange={(checked) => (consent = checked)}
                />
              {/if}
              <Button
                type="submit"
                variant="primary"
                label={busy ? 'Proszę czekać…' : modeLabel}
                isLoading={busy}
                width="100%"
              />
            </VStack>
          </form>

          {#if message}
            <Banner status="info" title={message} />
          {/if}

          {#if mode === 'reset'}
            <Button
              variant="secondary"
              label="Wróć do logowania"
              width="100%"
              isDisabled={busy}
              onclick={() => {
                mode = 'login';
                message = '';
              }}
            />
          {/if}

          <Text type="supporting" color="secondary">
            Nowe konta wymagają aktywacji przez zarząd KSI.
          </Text>
        {/if}
      </VStack>
    </Card>

    <HStack justify="between" vAlign="center" gap={2} wrap="wrap">
      <Link href={data.websiteOrigin} type="supporting" color="secondary">Wróć na stronę KSI</Link>
      <Text type="supporting" color="secondary">KSI · Uniwersytet Wrocławski</Text>
      <Text type="supporting" color="secondary">v{import.meta.env.PUBLIC_APP_VERSION}</Text>
      <Link
        href={import.meta.env.PUBLIC_COMMIT_HASH
          ? `https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`
          : 'https://github.com/ksiuwr/ksi-core'}
        type="supporting"
        color="secondary"
        isExternalLink
      >
        {import.meta.env.PUBLIC_COMMIT_HASH?.slice(0, 7) || 'Kod źródłowy'}
      </Link>
    </HStack>
  </VStack>
</main>
