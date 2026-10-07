<script lang="ts">
  import { LogIn, LogOut, Menu } from '@lucide/svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales } from '../locales/data';
  import type { User, Session } from '@ksi-core/server/lib/auth.types';
  import Alert from './Alert.svelte';
  import type { api } from '$lib/backend';
  import ThemeButton from './ThemeButton.svelte';
  import { authClient } from '$lib/auth-client';
  import { toast } from 'svelte-sonner';
  import { invalidateAll } from '$app/navigation';

  interface Props {
    alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;
    user: User | null;
    session: Session | null;
  }

  const { alert, user, session }: Props = $props();

  let availableLocales = $derived(
    locales
      .map((locale) => ({
        code: locale,
        emoji: getFlagEmoji(locale),
        formattedLocale: new Intl.DisplayNames([locale], { type: 'language' }).of(locale)!
      }))
      .toSorted((a, b) => a.formattedLocale.localeCompare(b.formattedLocale))
  );
  let activeLocale = $derived(
    availableLocales.find((l) => l.code === locale.current) || availableLocales[0]
  );

  function getFlagEmoji(countryCode: string) {
    if (countryCode.includes('-')) return getFlagEmoji(countryCode.split('-')[1]);
    return [...countryCode.toUpperCase()]
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  }
</script>

<header
  id="navbar"
  class="border-b-base-200 bg-base-100/95 sticky top-0 z-40 flex h-12 w-full border-b backdrop-blur-sm lg:px-12"
>
  {#if alert}
    <div class="w-full">
      <Alert {alert} />
    </div>
  {/if}

  <div class="mx-auto flex w-full flex-row items-center justify-between lg:max-w-7xl">
    <nav class="flex h-full w-full items-center justify-between not-lg:hidden">
      <div class="flex h-full items-center gap-2">
        <button class="md:hidden">
          <div class="relative size-5">
            <span
              class="absolute inset-0 flex items-center justify-center transition-all duration-200"
            >
              <Menu class="size-5" />
            </span>
          </div>
        </button>

        <a href="/" class="btn btn-ghost btn-sm items-center">
          <img src="/logo.svg" alt="" class="size-6 min-w-6 shrink-0 dark:invert" />
          <span class="text-xs tracking-tight not-lg:hidden">KSI</span>
        </a>
        <a href="/projects" class="btn btn-soft btn-sm items-center"> Projects </a>
        {#if session && user}
          <a href="/dashboard" class="btn btn-square btn-soft btn-sm items-center"> Dashboard </a>
        {/if}
      </div>

      <div class="flex items-center gap-4">
        <div class="dropdown dropdown-bottom">
          <div
            tabindex="0"
            role="button"
            class="btn btn-soft btn-sm text-muted text-xs font-medium uppercase"
          >
            <span class="select-none">{activeLocale.emoji} {activeLocale.code}</span>
          </div>

          <ul
            class="dropdown-content menu bg-base-200 text-base-content border-base-300 right-0 z-99 mt-2 w-60 border p-2 shadow"
          >
            {#each availableLocales as loc}
              <li>
                <button
                  class:active={locale.current === loc.code}
                  onclick={() => setLocale(loc.code)}
                  class={[
                    'items-centers flex gap-2 rounded-none py-2 font-semibold uppercase',

                    locale.current === loc.code
                      ? 'text-primary-content bg-primary'
                      : 'text-muted-100 hover:bg-base-300'
                  ]}
                >
                  {loc.emoji}
                  {loc.formattedLocale}
                </button>
              </li>
            {/each}
          </ul>
        </div>
        <ThemeButton />

        {#if session && user}
          <div class="flex gap-4">
            <a
              href="/dashboard"
              class="text-muted hover:text-base-content flex items-center gap-4 text-sm"
            >
              {#if user.image}
                <img
                  src={user.image}
                  class="size-6 rounded-full"
                  alt={`${user.name}'s profile picture`}
                />
              {/if}
              {user.name}
            </a>
            <button
              class="btn btn-circle text-error"
              onclick={async () => {
                const r = await authClient.signOut();
                if (r.data?.success) {
                  toast.success('Logged out');
                  await invalidateAll();
                }
              }}
            >
              <LogOut class="size-4 shrink-0" />
            </button>
          </div>
        {:else}
          <button class="btn btn-sm btn-soft btn-square">
            <div class="relative size-5">
              <span
                class="absolute inset-0 flex items-center justify-center transition-all duration-200"
              >
                <LogIn class="size-3" />
              </span>
            </div>
          </button>
        {/if}
      </div>
    </nav>
  </div>
</header>
