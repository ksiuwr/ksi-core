<script lang="ts">
  import { onMount } from 'svelte';
  import { createAuthClient } from 'better-auth/svelte';

  let { data } = $props();
  import { Github, ArrowUpRight, ArrowRight, UserRound, KeyRound } from '@lucide/svelte';
  import ThemeSelector from '@ksi-core/ui/platform/ThemeSelector.svelte';
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
        message = result.error.message ?? 'Login failed.';
      } else if (mode !== 'login') {
        message = 'Check your email inbox.';
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
      message = 'Server unavailable.';
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
        message = result.error.message ?? 'Login failed.';
        busy = false;
      }
    } catch {
      message = 'Server unavailable.';
      busy = false;
    }
  }
  function forget(e: string) {
    hints = hints.filter((h) => h.email !== e);
    localStorage.setItem('ksi-account-hints', JSON.stringify(hints));
  }

  const modeLabel = $derived(
    mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send recovery link' : 'Sign in'
  );

  const titleLabel = $derived(
    mode === 'signup' ? 'Join KSI' : mode === 'reset' ? 'Recover access' : 'Welcome to KSI'
  );
</script>

<svelte:head>
  <title>{'Sign in'} · KSI</title>
</svelte:head>

<main class="auth-shell">
  <div class="auth-frame">
    <header class="auth-topbar">
      <a class="auth-brand" href={data.websiteOrigin}>KSI<span>/ core</span></a>
      <div class="auth-preferences">
        <ThemeSelector {language} /><button
          class="btn btn-outline language-button"
          aria-label={'Change language'}
          onclick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
          >{language === 'pl' ? 'EN' : 'PL'}</button
        >
      </div>
    </header>
    <section class="auth-card" aria-labelledby="auth-title">
      {#if data.user}
        <h1 id="auth-title">{'Welcome to KSI'}</h1>
        <p class="auth-intro">
          {'You are signed in as'} <strong>{data.user.name || data.user.email}</strong>.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
          <a class="btn submit-button" href={data.dashboardOrigin} style="text-decoration: none;">
            {'Go to Dashboard'}<ArrowRight size={16} aria-hidden="true" />
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
            {'Sign out'}
          </button>
        </div>
      {:else}
        <h1 id="auth-title">{titleLabel}</h1>
        <p class="auth-intro">
          {'One account. Every KSI project and conversation.'}
        </p>
        {#if mode !== 'reset'}<div class="auth-mode" role="group" aria-label={'Account options'}>
            <button
              class:active={mode === 'login'}
              aria-pressed={mode === 'login'}
              disabled={busy}
              onclick={() => {
                mode = 'login';
                message = '';
              }}>{'Sign in'}</button
            ><button
              class:active={mode === 'signup'}
              aria-pressed={mode === 'signup'}
              disabled={busy}
              onclick={() => {
                mode = 'signup';
                message = '';
              }}>{'Create account'}</button
            >
          </div>{/if}
        {#if hints.length && mode === 'login'}<div class="hint-list">
            <p class="hint-label">{'Remembered accounts'}</p>
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
                  aria-label={`${'Forget account'}: ${hint.email}`}>{'Forget'}</button
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
              ><Github size={18} aria-hidden="true" /><span>{'Continue with GitHub'}</span
              ><ArrowUpRight size={15} aria-hidden="true" /></button
            ><button
              type="button"
              class="btn btn-outline oauth-btn"
              disabled={busy}
              onclick={() => provider('google')}
              ><span class="google-icon" aria-hidden="true">G</span><span
                >{'Continue with Google'}</span
              ><ArrowUpRight size={15} aria-hidden="true" /></button
            >
          </div>
          <div class="separator">{'or use email'}</div>{/if}
        <form class="auth-form" onsubmit={submit}>
          {#if mode === 'signup'}<div class="auth-field">
              <label for="auth-name">{'Full name'}</label><input
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
                <label for="auth-password">{'Password'}</label>{#if mode === 'login'}<button
                    type="button"
                    class="text-button"
                    disabled={busy}
                    onclick={() => {
                      mode = 'reset';
                      message = '';
                    }}>{'Forgot password'}</button
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
              ><input
                type="checkbox"
                bind:checked={consent}
                disabled={busy}
              />{'Remember account on this device'}</label
            >{/if}
          <button class="btn submit-button" disabled={busy}
            >{busy ? 'Please wait…' : modeLabel}<ArrowRight size={16} aria-hidden="true" /></button
          >
        </form>
        {#if message}<p role="status" class="auth-message">{message}</p>{/if}
        {#if mode === 'reset'}<button
            class="btn btn-outline auth-back"
            disabled={busy}
            onclick={() => {
              mode = 'login';
              message = '';
            }}>{'Back to sign in'}</button
          >{/if}
        <p class="activation-note">
          {'New accounts require activation by the KSI board.'}
        </p>
      {/if}
    </section>
    <footer class="auth-footer">
      <a href={data.websiteOrigin}>{'Back to KSI'}<ArrowUpRight size={13} aria-hidden="true" /></a
      ><span class="right-col">KSI · {'University of Wrocław'}</span><span
        >v{import.meta.env.PUBLIC_APP_VERSION}</span
      ><a
        class="right-col"
        href={import.meta.env.PUBLIC_COMMIT_HASH
          ? `https://github.com/ksiuwr/ksi-core/commit/${import.meta.env.PUBLIC_COMMIT_HASH}`
          : 'https://github.com/ksiuwr/ksi-core'}
        target="_blank"
        rel="noopener noreferrer">{import.meta.env.PUBLIC_COMMIT_HASH?.slice(0, 7) || 'Source'}</a
      >
    </footer>
  </div>
</main>
