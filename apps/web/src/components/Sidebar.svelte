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
  <div class="flex w-full flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
    <SidebarAccordion title="Projects">
      <SidebarLink href="/projects/zosia" icon={MountainSnow} exact={false}>Zosia</SidebarLink>
      <SidebarLink href="/projects/ml" icon={BrainCircuit} exact={false}
        >Machine Learning</SidebarLink
      >
      <SidebarLink href="/projects/hoc" icon={Blocks} exact={false}>Hour of Code</SidebarLink>
      <SidebarLink href="/projects/ket" icon={Atom} exact={false}>KET</SidebarLink>
    </SidebarAccordion>

    {#if session !== null}
      <div class="border-base-200 mt-2 flex flex-col gap-1 border-t pt-3">
        <div class="bg-base-200/50 flex items-center justify-between rounded-lg px-3 py-2">
          <div class="flex min-w-0 flex-col">
            <span class="mb-0.5 text-xs leading-none opacity-50">Logged in as</span>
            <span class="text-primary truncate text-sm font-semibold">{user?.name}</span>
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
            class="btn btn-ghost btn-sm btn-square text-error ml-2 shrink-0"
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
  <div class="border-base-200 flex shrink-0 flex-col gap-2 border-t px-3 py-3">
    <!-- Locale picker — full width -->
    <div class="dropdown dropdown-top w-full">
      <div
        tabindex="0"
        role="button"
        class="btn btn-md btn-outline hover:text-base-content flex w-full cursor-pointer items-center gap-1.5 capitalize transition-colors duration-150"
      >
        <span class="truncate select-none">{activeLocale.emoji} {activeLocale.formattedLocale}</span
        >
        <ChevronDown class="ml-auto size-3 shrink-0" />
      </div>
      <ul
        class="dropdown-content menu bg-base-200 border-base-300 text-base-content left-0 z-99 mb-2 w-full rounded-md border p-1.5 shadow-lg"
      >
        {#each availableLocales as loc}
          <li>
            <button
              onclick={() => setLocale(loc.code)}
              class={[
                'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium capitalize',
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
            authClient.signIn
              .social({
                provider: 'discord',
                callbackURL: getUrls().FRONTEND + '/dashboard'
              })
              .catch((error) => {
                if (error instanceof Error) {
                  if (/(fetch|network|load failed)/i.test(error.message))
                    toast.error('Network error when trying to sign in');
                  else toast.error(`Unknown error occurred (${error.message})`);
                } else {
                  toast.error('Unknown error occurred');
                }
              });
          }}
          class="btn btn-md btn-outline text-error ml-auto shrink-0"
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
  class="fixed top-0 left-0 z-50 flex h-screen w-full flex-col shadow-2xl transition-transform duration-300 ease-out lg:hidden {$sidebarStore
    ? 'translate-x-0'
    : '-translate-x-full'}"
>
  <div class="border-base-200 bg-base-100 flex h-18 items-center border-r border-b">
    <button
      onclick={() => {
        $sidebarStore = false;
      }}
      class="btn btn-square btn-ghost border-base-200 size-18 rounded-none border-r"
    >
      <PanelLeftClose class="size-5" />
    </button>
    <a href="/" class="flex h-18 flex-1 items-center gap-3 px-2 font-mono">
      <img src="/logo.svg" alt="" class="size-10 dark:invert" />
      <span class="text-lg font-bold tracking-tight">KSI UWr</span>
    </a>
  </div>

  <div class="bg-base-100 border-base-200 flex h-full w-full flex-col overflow-hidden border-r">
    {@render sidebarContent()}
  </div>
</div>

<div
  role="presentation"
  class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden {$sidebarStore
    ? 'opacity-100'
    : 'pointer-events-none opacity-0'}"
  onclick={() => ($sidebarStore = false)}
></div>
