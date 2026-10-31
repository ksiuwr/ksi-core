<script lang="ts">
  import { onMount } from 'svelte';
  import { createAuthClient } from 'better-auth/svelte';

  let { data } = $props();
  import { Github, ArrowUpRight, ArrowRight, UserRound, KeyRound } from '@lucide/svelte';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences, setLanguage } from '@ksi-core/ui/platform/preferences';
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
  <div class="auth-frame">
    <header class="auth-topbar">
      <a class="auth-brand" href={data.websiteOrigin}>KSI<span>/ core</span></a>
      <div class="auth-preferences">
        <ThemeSelector /><button
          class="btn btn-outline language-button"
          aria-label={'Zmień język'}
          onclick={() => setLanguage(language === 'pl' ? 'en-us' : 'pl')}
          >{language === 'pl' ? 'EN' : 'PL'}</button
        >
      </div>
    </header>
    <section class="auth-card" aria-labelledby="auth-title">
      {#if data.user}
        <h1 id="auth-title">Witaj w KSI</h1>
        <p class="auth-intro">
          Jesteś zalogowany(a) jako <strong>{data.user.name || data.user.email}</strong>.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
          <a class="btn submit-button" href={data.dashboardOrigin} style="text-decoration: none;">
            Przejdź do Panelu<ArrowRight size={16} aria-hidden="true" />
          </a>
          <button
            type="button"
            class="btn btn-outline"
            disabled={busy}
            onclick={async () => {
              busy = true;
              await client.signOut();
              location.reload();
            }}
          >
            Wyloguj się
          </button>
        </div>
      {:else}
        <h1 id="auth-title">{titleLabel}</h1>
        <p class="auth-intro">Jedno konto. Wszystkie projekty i rozmowy KSI.</p>
        {#if mode !== 'reset'}<div
            class="auth-mode"
            role="group"
            aria-label={'Opcje konta'}
            use:slider
          >
            <button
              class:active={mode === 'login'}
              aria-pressed={mode === 'login'}
              disabled={busy}
              onclick={() => {
                mode = 'login';
                message = '';
              }}>Logowanie</button
            ><button
              class:active={mode === 'signup'}
              aria-pressed={mode === 'signup'}
              disabled={busy}
              onclick={() => {
                mode = 'signup';
                message = '';
              }}>Nowe konto</button
            >
          </div>{/if}
        {#if hints.length && mode === 'login'}<div class="hint-list">
            <p class="hint-label">Zapamiętane konta</p>
            {#each hints as hint (hint.email)}<div class="hint-item">
                <button
                  class="hint-name"
                  disabled={busy}
                  onclick={() => {
                    email = hint.email;
                    document.getElementById('auth-password')?.focus();
                  }}
                  ><UserRound size={17} aria-hidden="true" /><span
                    >{hint.name}<small>{hint.email}</small></span
                  ></button
                ><button
                  class="hint-forget"
                  disabled={busy}
                  onclick={() => forget(hint.email)}
                  aria-label={`${'Zapomnij konto'}: ${hint.email}`}>Zapomnij</button
                >
              </div>{/each}
          </div>{/if}
      {/if}
      {#if !data.user}
        {#if mode !== 'reset'}<div class="oauth-providers">
            <button
              type="button"
              class="btn btn-outline oauth-btn"
              disabled={busy}
              onclick={() => provider('github')}
              ><Github size={18} aria-hidden="true" /><span>Kontynuuj z GitHub</span><ArrowUpRight
                size={15}
                aria-hidden="true"
              /></button
            ><button
              type="button"
              class="btn btn-outline oauth-btn"
              disabled={busy}
              onclick={() => provider('google')}
              ><span class="google-icon" aria-hidden="true">G</span><span>Kontynuuj z Google</span
              ><ArrowUpRight size={15} aria-hidden="true" /></button
            >
          </div>
          <div class="separator">lub użyj adresu e-mail</div>{/if}
        <form class="auth-form" onsubmit={submit}>
          {#if mode === 'signup'}<div class="auth-field">
              <label for="auth-name">Pełne imię i nazwisko</label><input
                id="auth-name"
                autocomplete="name"
                bind:value={name}
                placeholder="Anna Kowalska"
                required
                disabled={busy}
              />
            </div>{/if}
          <div class="auth-field">
            <label for="auth-email">E-mail</label><input
              id="auth-email"
              type="email"
              autocomplete="email"
              bind:value={email}
              placeholder="anna@example.com"
              required
              disabled={busy}
            />
          </div>
          {#if mode !== 'reset'}<div class="auth-field">
              <div class="password-label">
                <label for="auth-password">Hasło</label>{#if mode === 'login'}<button
                    type="button"
                    class="text-button"
                    disabled={busy}
                    onclick={() => {
                      mode = 'reset';
                      message = '';
                    }}>Nie pamiętam hasła</button
                  >{/if}
              </div>
              <input
                id="auth-password"
                type="password"
                autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minlength="8"
                bind:value={password}
                required
                disabled={busy}
              />
            </div>{/if}
          {#if mode === 'login'}<label class="remember"
              ><input type="checkbox" bind:checked={consent} disabled={busy} />Zapamiętaj konto na
              tym urządzeniu</label
            >{/if}
          <button class="btn submit-button" disabled={busy}
            >{busy ? 'Proszę czekać…' : modeLabel}<ArrowRight
              size={16}
              aria-hidden="true"
            /></button
          >
        </form>
        {#if message}<p role="status" class="auth-message">{message}</p>{/if}
        {#if mode === 'reset'}<button
            class="btn btn-outline auth-back"
            disabled={busy}
            onclick={() => {
              mode = 'login';
              message = '';
            }}>Wróć do logowania</button
          >{/if}
        <p class="activation-note">Nowe konta wymagają aktywacji przez zarząd KSI.</p>
      {/if}
    </section>
    <footer class="auth-footer">
      <a href={data.websiteOrigin}
        >Wróć na stronę KSI<ArrowUpRight size={13} aria-hidden="true" /></a
      ><span class="right-col">KSI · Uniwersytet Wrocławski</span><span
        >v{import.meta.env.PUBLIC_APP_VERSION}</span
      ><a
        class="right-col"
        href={import.meta.env.PUBLIC_COMMIT_HASH
          ? `https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`
          : 'https://github.com/ksiuwr/ksi-core'}
        target="_blank"
        rel="noopener noreferrer"
        >{import.meta.env.PUBLIC_COMMIT_HASH?.slice(0, 7) || 'Kod źródłowy'}</a
      >
    </footer>
  </div>
</main>
