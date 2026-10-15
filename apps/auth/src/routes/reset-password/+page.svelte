<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { createAuthClient } from 'better-auth/svelte';
  import { KeyRound, ArrowLeft } from '@lucide/svelte';
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
      message = result.error?.message ?? 'Password changed. You can sign in now.';
    } catch {
      message = 'Server unavailable.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>{'New password'} · KSI</title></svelte:head>
<main class="auth-shell">
  <div class="auth-frame">
    <header class="auth-topbar">
      <a class="auth-brand" href="/">KSI<span>/ core</span></a>
      <div class="auth-preferences">
        <ThemeSelector {language} /><button
          class="btn btn-outline language-button"
          aria-label={'Change language'}
          onclick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
          >{language === 'pl' ? 'EN' : 'PL'}</button
        >
      </div>
    </header>
    <section class="auth-card" aria-labelledby="reset-title">
      <h1 id="reset-title">{'New password'}</h1>
      <p class="auth-intro">
        {'Choose a new password for your KSI account.'}
      </p>
      {#if !token}<p role="alert" class="auth-message">
          {'Recovery link missing. Request a new link on the sign-in page.'}
        </p>{:else if !changed}<form class="auth-form" onsubmit={submit}>
          <div class="auth-field">
            <label for="password">{'Password'}</label><input
              id="password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              disabled={busy}
              bind:value={password}
            />
          </div>
          <button class="btn submit-button" disabled={busy}
            >{busy ? 'Saving…' : 'Save password'}</button
          >
        </form>{/if}{#if message}<p role="status" class="auth-message">{message}</p>{/if}<a
        class="btn btn-outline auth-back"
        href="/"><ArrowLeft size={15} aria-hidden="true" />{'Back to sign in'}</a
      >
    </section>
    <footer class="auth-footer">
      <a href="/">{'Back to KSI'}</a><span class="right-col">KSI · {'University of Wrocław'}</span
      ><span>v{import.meta.env.PUBLIC_APP_VERSION}</span><a
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
