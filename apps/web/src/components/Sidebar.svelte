<script lang="ts">
  import { showAdmin, sidebarStore } from '$lib/sidebar';
  import {
    Atom,
    Blocks,
    BrainCircuit,
    ChevronDown,
    File,
    FileIcon,
    LogIn,
    LogOut,
    Megaphone,
    MountainSnow,
    PanelLeftClose,
    TableProperties,
    Wrench
  } from '@lucide/svelte';
  import type { User, Session } from '@ksi-core/server/lib/auth.types';
  import { authClient } from '../lib/auth-client';
  import { api } from '$lib/backend';
  import { toast } from 'svelte-sonner';
  import SidebarAccordion from './SidebarAccordion.svelte';
  import { page } from '$app/stores';
  import SidebarLink from './SidebarLink.svelte';
  import { getUrls } from 'shared';
  import { invalidateAll } from '$app/navigation';
  import ThemeButton from './ThemeButton.svelte';
  import { locale, setLocale } from '$lib/locale.svelte';
  import { locales } from '../locales/data';

  interface Props {
    user: User | null;
    session: Session | null;
  }

  const { user, session }: Props = $props();

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

  $effect(() => {
    if (user !== null) {
      api.dashboard.user.get().then(async (r) => {
        if (r.error) {
          await authClient.signOut();
          await invalidateAll();
          toast.error('Access denied.', {
            id: 'access_denied'
          });
          return;
        }
      });
    }
  });

  $effect(() => {
    if ($page.url.pathname) {
      $sidebarStore = false;
    }
  });
</script>

{#snippet sidebarContent()}
  <div class="flex flex-col flex-1 w-full overflow-y-auto px-3 py-3 gap-1">
    <SidebarAccordion title="Projects">
      <SidebarLink href="/projects/zosia" icon={MountainSnow} exact={false}>Zosia</SidebarLink>
      <SidebarLink href="/projects/ml" icon={BrainCircuit} exact={false}
        >Machine Learning</SidebarLink
      >
      <SidebarLink href="/projects/hoc" icon={Blocks} exact={false}>Hour of Code</SidebarLink>
      <SidebarLink href="/projects/ket" icon={Atom} exact={false}>KET</SidebarLink>
    </SidebarAccordion>

    {#if session !== null}
      <div class="mt-2 border-t border-base-200 pt-3 flex flex-col gap-1">
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200/50">
          <div class="flex flex-col min-w-0">
            <span class="text-xs opacity-50 leading-none mb-0.5">Logged in as</span>
            <span class="text-sm font-semibold text-primary truncate">{user?.name}</span>
          </div>
          <button
            type="button"
            onclick={async () => {
              const r = await authClient.signOut();
              if (r.data?.success) {
                toast.success('Logged out');
                await invalidateAll();
              }
            }}
            class="btn btn-ghost btn-sm btn-square text-error shrink-0 ml-2"
            title="Logout"
          >
            <LogOut class="size-4" />
          </button>
        </div>

        <SidebarAccordion title="Dashboard">
          <SidebarLink href="/dashboard" icon={Wrench}>Home</SidebarLink>
          <SidebarLink href="/dashboard/alerts" icon={Megaphone}>Alerts</SidebarLink>
          <SidebarLink href="/dashboard/s3cache" icon={TableProperties}>S3 Cache</SidebarLink>
        </SidebarAccordion>
      </div>
    {/if}
  </div>

  <!-- Sticky bottom utility bar -->
  <div class="shrink-0 border-t border-base-200 px-3 py-3 flex flex-col gap-2">
    <!-- Locale picker — full width -->
    <div class="dropdown dropdown-top w-full">
      <div
        tabindex="0"
        role="button"
        class="btn btn-md w-full hover:text-base-content transition-colors duration-150 flex items-center gap-1.5 cursor-pointer capitalize"
      >
        <span class="select-none truncate">{activeLocale.emoji} {activeLocale.formattedLocale}</span
        >
        <ChevronDown class="size-3 shrink-0 ml-auto" />
      </div>
      <ul
        class="dropdown-content left-0 rounded-md w-full menu bg-base-200 border border-base-300 text-base-content z-99 p-1.5 shadow-lg mb-2"
      >
        {#each availableLocales as loc}
          <li>
            <button
              onclick={() => setLocale(loc.code)}
              class={[
                'flex items-center w-full px-3 py-1.5 gap-2 capitalize text-sm font-medium rounded-md',
                locale.current === loc.code
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              ]}
            >
              {loc.emoji}
              {loc.formattedLocale}
            </button>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Theme toggle + login on same row -->
    <div class="flex items-center gap-2">
      <ThemeButton />

      {#if session === null}
        <button
          onclick={() => {
            authClient.signIn.social({
              provider: 'discord',
              callbackURL: getUrls().FRONTEND + '/dashboard'
            });
          }}
          class="btn btn-md text-error shrink-0 ml-auto"
          title="Member access"
        >
          <LogIn class="size-4" />
          <span class="font-mono text-xs uppercase">Login</span>
        </button>
      {/if}
    </div>
  </div>
{/snippet}

<div
  class="fixed top-0 left-0 h-screen w-full flex flex-col z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-out {$sidebarStore
    ? 'translate-x-0'
    : '-translate-x-full'}"
>
  <div class="flex h-18 items-center border-b border-r border-base-200 bg-base-100">
    <button
      onclick={() => {
        $sidebarStore = false;
      }}
      class="btn btn-square btn-ghost size-18 rounded-none border-r border-base-200"
    >
      <PanelLeftClose class="size-5" />
    </button>
    <a href="/" class="flex flex-1 h-18 justify-center gap-3 items-center font-mono">
      <img src="/logo.svg" alt="" class="size-10 dark:invert" />
      <span class="text-lg font-bold tracking-tight">KSI UWr</span>
    </a>
  </div>

  <div class="bg-base-100 flex flex-col w-full h-full overflow-hidden border-r border-base-200">
    {@render sidebarContent()}
  </div>
</div>

<div
  role="presentation"
  class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-out {$sidebarStore
    ? 'opacity-100'
    : 'opacity-0 pointer-events-none'}"
  onclick={() => ($sidebarStore = false)}
></div>
